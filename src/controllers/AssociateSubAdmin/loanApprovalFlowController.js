const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { selectOpsManager, selectSeniorOpsManager } = require("../../../helper/selectOpsManager");
const { selectCreditManagerByScore, selectCreditManagerByRole } = require("../../../helper/selectCreditManager");
const { selectFinanceManager } = require("../../../helper/selectFinanceManager");
const { selectDisbursalManager } = require("../../../helper/selectDisbursalManager");

const prisma = new PrismaClient();

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
    });
    if (!associateSubAdmin) return res.respond(404, "Associate SubAdmin not found.");

    let loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    const result = await prisma.$transaction(async (tx) => {
        if (action === "REJECT") {
            return await RejectApplication(tx, loanApplicationId, associateSubAdmin.id, remarks);
        }

        if (assignTo === "Ops") {
            return await assignToOps(tx, loanApplication, associateSubAdmin.id, remarks);
        }

        if (assignTo === "Senior_Ops") {
            return await assignToSeniorOps(tx, loanApplication, associateSubAdmin.id, remarks);
        }

        if (assignTo === "Senior_Credit") {
            return await assignToCredit(tx, loanApplication, associateSubAdmin.id, remarks);
        }

        if (assignTo.startsWith("Credit")) {
            return await assignToCreditLevel(tx, loanApplication, associateSubAdmin.id, assignTo, remarks);
        }

        if (assignTo === "Finance") {
            return await assignToFinance(tx, loanApplication, associateSubAdmin.id, remarks);
        }

        if (assignTo === "Disbursal") {
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
    const creditReport = await prisma.loanCrifReport.findUnique({
        where: { loanApplicationId: loanApplication.id },
    });
    if (!creditReport) return res.respond(404, "Credit Report not found for this Loan Application!");

    const score =
        creditReport?.["CIR-REPORT-FILE"]
        ?.["REPORT-DATA"]
        ?.["STANDARD-DATA"]
        ?.["SCORE"]?.[0]
        ?.["VALUE"] || null;

    console.log(score);

    if (!score) return res.respond(400, "Score is Invalid!");

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

    await tx.loanApplicationLogs.create({
        data: {
            loanApplicationId: loanApplication.id,
            performedById,
            assignedToId: selectedCredit.id,
            action: "REASSIGNED_TO_CREDIT",
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

module.exports = {
    processLoanApproval,
};