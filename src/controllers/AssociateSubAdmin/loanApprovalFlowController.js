const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { selectOpsManager, selectSeniorOpsManager } = require("../../../helper/selectOpsManager");
const { selectCreditManagerByScore, selectCreditManagerByRole } = require("../../../helper/selectCreditManager");
const { selectFinanceManager } = require("../../../helper/selectFinanceManager");
const { selectDisbursalManager } = require("../../../helper/selectDisbursalManager");
const { calculateEmi } = require("../../../utils/emiCalculator");

const prisma = new PrismaClient();

function hasRole(roleName, allowedRoles = []) {
    return roleName && allowedRoles.includes(roleName);
}

function hasAnyCreditRole(roleName) {
    return roleName && roleName.startsWith("Credit");
}

// ##########----------Loan Application Approval Rejection Flow----------##########
const processLoanApproval = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { assignTo, action, remarks } = req.body

    if (!loanApplicationId) return res.respond(400, "Loan Application Id is required.");
    if (!assignTo ||
        (!["Ops", "Senior_Ops", "Senior_Credit", "Finance", "Disbursal"].includes(assignTo) && !assignTo.startsWith("Credit"))) {
        return res.respond(400, "assignTo is required.");
    }
    if (!action || !["APPROVE", "REJECT"].includes(action)) return res.respond(400, "action is required.");
    if (!remarks) return res.respond(400, "remarks is required.");

    const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
        include: { role: true },
    });
    if (!associateSubAdmin) return res.respond(404, "Associate SubAdmin not found.");

    let loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    const roleName = associateSubAdmin?.role?.roleName;
    const result = await prisma.$transaction(async (tx) => {
        if (action === "REJECT") {
            return await RejectApplication(tx, loanApplicationId, associateSubAdmin.id, remarks);
        }

        if (assignTo === "Ops") {
            return await assignToOps(tx, loanApplication, associateSubAdmin.id, remarks);
        }

        if (assignTo === "Senior_Ops") {
            if (!hasRole(roleName, ["Ops"])) {
                return res.respond(
                    403,
                    "You are not authorized to assign this loan to Senior Ops. Only Ops managers can perform this action."
                );
            }

            return await assignToSeniorOps(tx, loanApplication, associateSubAdmin.id, remarks);
        }

        if (assignTo === "Credit") {
            if (!hasRole(roleName, ["Senior_Ops"])) {
                return res.respond(
                    403,
                    "You are not authorized to assign this loan to Credit. Only Senior Ops managers can perform this action."
                );
            }

            return await assignToCredit(tx, loanApplication, associateSubAdmin.id, remarks);
        }

        if (assignTo.startsWith("Credit") || assignTo === "Senior_Credit") {
            if (
                !hasRole(roleName, ["Senior_Credit", "Finance"]) &&
                !hasAnyCreditRole(roleName)
            ) {
                return res.respond(
                    403,
                    "You are not authorized to assign this loan to a Credit level. Only Finance Managers or Credit managers can perform this action."
                );
            }

            return await assignToCreditLevel(tx, loanApplication, associateSubAdmin.id, assignTo, remarks);
        }

        if (assignTo === "Finance") {
            if (!hasRole(roleName, ["Senior_Credit"])) {
                return res.respond(
                    403,
                    "You are not authorized to assign this loan to Finance. Only Senior Credit managers can perform this action."
                );
            }

            return await assignToFinance(tx, loanApplication, associateSubAdmin.id, remarks);
        }

        if (assignTo === "Disbursal") {
            if (!hasRole(roleName, ["Finance"])) {
                return res.respond(
                    403,
                    "You are not authorized to assign this loan to Disbursal. Only Finance managers can perform this action."
                );
            }

            return await assignToDisbursal(tx, loanApplication, associateSubAdmin.id, remarks);
        }

        throw new Error("Invalid assignment flow");
    });

    res.respond(200, "Loan Application assignment updated.", result);
});

// ##########----------Reject Loan Application Function----------##########
async function RejectApplication(tx, loanApplicationId, performedById, remarks) {
    await tx.loanApplication.update({
        where: { id: loanApplicationId },
        data: {
            customerStatus: "REJECTED",
            internalStatus: "REJECTED"
        }
    });

    await tx.loanApplicationLogs.create({
        data: {
            loanApplicationId,
            performedById,
            assignedToId: null,
            action: "REJECTED",
            remarks
        }
    });

    return { status: "REJECTED" };
}

// ##########----------Assign Loan Application To Ops Function----------##########
async function assignToOps(tx, loanApplication, performedById, remarks) {
    const selectedOps = await selectOpsManager(tx, loanApplication.approverId);

    await tx.loanApplication.update({
        where: { id: loanApplication.id },
        data: {
            approverId: selectedOps.id,
            customerStatus: "UNDER_REVIEW",
            internalStatus: "OPS_PENDING"
        }
    });

    await tx.loanApplicationLogs.create({
        data: {
            loanApplicationId: loanApplication.id,
            performedById,
            assignedToId: selectedOps.id,
            action: "ASSIGNED_TO_OPS",
            remarks
        }
    });

    return { status: "ASSIGNED_TO_OPS", assignedTo: selectedOps };
}

// ##########----------Assign Loan Application To Senior Ops Function----------##########
async function assignToSeniorOps(tx, loanApplication, performedById, remarks) {
    const seniorOps = await selectSeniorOpsManager(
        tx,
        loanApplication.approverId
    );

    await tx.loanApplication.update({
        where: { id: loanApplication.id },
        data: {
            approverId: seniorOps.id,
            customerStatus: "UNDER_REVIEW",
            internalStatus: "SENIOR_OPS_PENDING"
        }
    });

    await tx.loanApplicationLogs.create({
        data: {
            loanApplicationId: loanApplication.id,
            performedById,
            assignedToId: seniorOps.id,
            action: "ASSIGNED_TO_SENIOR_OPS",
            remarks
        }
    });

    return { status: "ASSIGNED_TO_SENIOR_OPS", assignedTo: seniorOps };
}

// ##########----------Assign Loan Application To Credit Manager Function----------##########
async function assignToCredit(tx, loanApplication, performedById, remarks) {
    const loan = await prisma.loanApplication.findUnique({
        where: { id: loanApplication.id },
    });
    if (!loan) {
        throw new Error("Loan Application not found");
    }
    if (!loan.crifScore) {
        throw new Error("Credit Score not found for this Loan Application");
    }

    const score = loan.crifScore;

    const selectedCredit = await selectCreditManagerByScore(
        tx,
        loanApplication.productId,
        score
    );

    await tx.loanApplication.update({
        where: { id: loanApplication.id },
        data: {
            approverId: selectedCredit.id,
            customerStatus: "UNDER_REVIEW",
            internalStatus: "CREDIT_PENDING"
        }
    });

    await tx.loanApplicationLogs.create({
        data: {
            loanApplicationId: loanApplication.id,
            performedById,
            assignedToId: selectedCredit.id,
            action: "ASSIGNED_TO_CREDIT",
            remarks
        }
    });

    return {
        status: "ASSIGNED_TO_CREDIT",
        assignedTo: selectedCredit
    };
}

// ##########----------Assign Loan Application To Credit Level Manager Function----------##########
async function assignToCreditLevel(tx, loanApplication, performedById, creditRole, remarks) {
    const selectedCredit = await selectCreditManagerByRole(
        tx,
        creditRole,
        loanApplication.approverId
    );

    await tx.loanApplication.update({
        where: { id: loanApplication.id },
        data: {
            approverId: selectedCredit.id,
            customerStatus: "UNDER_REVIEW",
            internalStatus: "CREDIT_PENDING"
        }
    });

    const action =
        creditRole === "Senior_Credit"
            ? "ESCALATED_TO_SENIOR_CREDIT"
            : "REASSIGNED_TO_CREDIT_LEVEL";

    await tx.loanApplicationLogs.create({
        data: {
            loanApplicationId: loanApplication.id,
            performedById,
            assignedToId: selectedCredit.id,
            action,
            remarks
        }
    });

    return {
        status: "REASSIGNED_TO_CREDIT",
        assignedTo: selectedCredit
    };
}

// ##########----------Assign Loan Application To Finance Function----------##########
async function assignToFinance(tx, loanApplication, performedById, remarks) {
    const finance = await selectFinanceManager(tx, loanApplication.approverId);

    if (!finance) throw new Error("No active Finance Manager found");

    await tx.loanApplication.update({
        where: { id: loanApplication.id },
        data: {
            approverId: finance.id,
            customerStatus: "UNDER_REVIEW",
            internalStatus: "FINANCE_PENDING"
        }
    });

    await tx.loanApplicationLogs.create({
        data: {
            loanApplicationId: loanApplication.id,
            performedById,
            assignedToId: finance.id,
            action: "ASSIGNED_TO_FINANCE",
            remarks
        }
    });

    return { status: "ASSIGNED_TO_FINANCE", assignedTo: finance };
}

// ##########----------Assign Loan Application To Disbursal Manager Function----------##########
async function assignToDisbursal(tx, loanApplication, performedById, remarks) {
    const disbursalManager = await selectDisbursalManager(
        tx,
        loanApplication.approverId
    );

    await tx.loanApplication.update({
        where: { id: loanApplication.id },
        data: {
            approverId: disbursalManager.id,
            customerStatus: "UNDER_REVIEW",
            internalStatus: "DISBURSE_PENDING"
        }
    });

    await tx.loanApplicationLogs.create({
        data: {
            loanApplicationId: loanApplication.id,
            performedById,
            assignedToId: disbursalManager.id,
            action: "ASSIGNED_TO_DISBURSAL",
            remarks
        }
    });

    return {
        status: "ASSIGNED_TO_DISBURSAL",
        assignedTo: disbursalManager
    };
}

// ##########----------Approve Loan Application----------##########
const approveLoan = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    let {
        approvedAmount,
        interestRate,
        tenure,
        interestType = "FLAT",
        processingFeePercent,
        insuranceAmount,
        stampDuty,
        otherCharges
    } = req.body;

    if (!loanApplicationId) {
        return res.respond(400, "Loan Application Id is required.");
    }

    approvedAmount = Number(approvedAmount);
    interestRate = Number(interestRate);
    tenure = Number(tenure);
    processingFeePercent = Number(processingFeePercent);
    insuranceAmount = Number(insuranceAmount);
    stampDuty = Number(stampDuty);
    otherCharges = Number(otherCharges);

    if (
        Number.isNaN(approvedAmount) ||
        Number.isNaN(interestRate) ||
        Number.isNaN(tenure) ||
        Number.isNaN(processingFeePercent) ||
        Number.isNaN(insuranceAmount) ||
        Number.isNaN(stampDuty) ||
        Number.isNaN(otherCharges)
    ) {
        return res.respond(
            400,
            "approvedAmount, interestRate, tenure, processingFeePercent, insuranceAmount, stampDuty and otherCharges must be valid numbers"
        );
    }

    const processingFee = (approvedAmount * processingFeePercent) / 100;
    const processingFeeGst = processingFee * 0.18;

    const totalCharges =
        processingFee +
        processingFeeGst +
        insuranceAmount +
        stampDuty +
        otherCharges;

    const netDisbursalAmount = approvedAmount - totalCharges;

    const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
        include: { role: true },
    });
    if (!associateSubAdmin || associateSubAdmin.role.roleName !== "Senior_Credit") {
        return res.respond(403, "You are not authorized to approve this loan. Only Senior Credit managers can perform this action.");
    }

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
    });
    if (!loanApplication) {
        return res.respond(404, "Loan Application not found.");
    }

    const emiResult = calculateEmi({
        principal: approvedAmount,
        rate: interestRate,
        tenure,
        interestType,
    });

    const result = await prisma.$transaction(async (tx) => {

        await tx.loanApprovedData.upsert({
            where: { applicationId: loanApplication.id },
            update: { approvedAmount, interestRate, tenure, interestType },
            create: {
                applicationId: loanApplication.id,
                approvedAmount,
                interestRate,
                tenure,
                interestType
            },
        });

        await tx.loanEmiDetails.upsert({
            where: { applicationId: loanApplication.id },
            update: {
                emiAmount: emiResult.emiAmount,
                principalEmi: emiResult.principalEmi,
                interestEmi: emiResult.interestEmi,
                totalInterest: emiResult.totalInterest,
                totalPayable: emiResult.totalPayable,
                calculationJson: emiResult.meta,
            },
            create: {
                applicationId: loanApplication.id,
                emiAmount: emiResult.emiAmount,
                principalEmi: emiResult.principalEmi,
                interestEmi: emiResult.interestEmi,
                totalInterest: emiResult.totalInterest,
                totalPayable: emiResult.totalPayable,
                calculationJson: emiResult.meta,
            },
        });

        await tx.loanCharges.upsert({
            where: { applicationId: loanApplication.id },
            update: {
                processingFee,
                processingFeeGst,
                insuranceAmount,
                stampDuty,
                otherCharges,
                totalCharges
            },
            create: {
                applicationId: loanApplication.id,
                processingFee,
                processingFeeGst,
                insuranceAmount,
                stampDuty,
                otherCharges,
                totalCharges
            }
        });

        await tx.loanDisbursalSummary.upsert({
            where: { applicationId: loanApplication.id },
            update: {
                totalCharges,
                netDisbursalAmount
            },
            create: {
                applicationId: loanApplication.id,
                totalCharges,
                netDisbursalAmount
            }
        });

        await tx.loanApplication.update({
            where: { id: loanApplication.id },
            data: {
                creditApproved: true,
            },
        });

        return { emiResult };
    });

    res.respond(200, "Loan Application Approved Successfully.", result);
});

// ##########----------Add Loan Bank Details----------##########
const addLoanBankDetails = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { accountholderName, bankAccountNumber, ifsc, bankName, accountType } = req.body;

    if (!loanApplicationId) {
        return res.respond(400, "Loan Application Id is required.");
    }

    if (!accountholderName || !bankAccountNumber || !ifsc || !bankName || !accountType) {
        return res.respond(400, "All bank details are required.");
    }

    const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
        include: { role: true },
    });
    if (!associateSubAdmin || associateSubAdmin.role.roleName !== "Finance") {
        return res.respond(403, "Only Finance Managers can Add Bank Details.");
    }

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
    });
    if (!loanApplication) {
        return res.respond(404, "Loan Application not found.");
    }

    await prisma.loanBankDetails.upsert({
        where: { applicationId: loanApplication.id },
        update: {
            accountholderName,
            bankAccountNumber,
            ifsc,
            bankName,
            accountType,
        },
        create: {
            applicationId: loanApplication.id,
            accountholderName,
            bankAccountNumber,
            ifsc,
            bankName,
            accountType,
        },
    });

    res.respond(200, "Bank details saved successfully.");
});

module.exports = {
    processLoanApproval,
    approveLoan,
    addLoanBankDetails
};