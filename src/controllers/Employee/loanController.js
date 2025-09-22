const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { generateUniqueLoanCode } = require("../../../utils/uniqueCodeGenerator");
const { logLoanHistory, safeCreateAssignment } = require("../../../helper/loanFunc");

const prisma = new PrismaClient();

// ##########----------Upload Loan Documents----------##########
const uploadDocs = asyncHandler(async (req, res) => {
    const userId = req.user;

    const customer = await prisma.employee.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!customer) {
        return res.respond(404, "Customer not found.");
    }

    const doc = req.files?.doc?.[0];

    const docUrl = doc
        ? `/uploads/loan/doc/${doc.filename}`
        : null;

    res.respond(201, "Document uploaded successfully!", { imageUrl: docUrl });
});

// ##########----------Apply Loan----------##########
const applyLoan = asyncHandler(async (req, res) => {
    const customerId = req.user
    const { masterProductId } = req.params;
    const { values, score } = req.body;

    if (!masterProductId) return res.respond(400, "Master Product Id is required.");
    if (!Array.isArray(values) || values.length === 0) {
        return res.respond(400, "Values must be a non-empty array.");
    }

    for (const v of values) {
        if (!v.fieldId) return res.respond(400, "Each value must include fieldId.");
        if (v.subFieldId && !v.dropdownId) {
            return res.respond(400, `subFieldId (${v.subFieldId}) cannot exist without dropdownId.`);
        }
    }

    const customer = await prisma.employee.findFirst({
        where: { userId: customerId, isDeleted: false },
    });
    if (!customer) return res.respond(404, "Customer not found.");

    const product = await prisma.masterProduct.findUnique({
        where: { id: masterProductId },
    });
    if (!product) return res.respond(404, "Master Product not found.");

    const { createdApplication, assignedTo } = await prisma.$transaction(async (tx) => {
        const loanCode = await generateUniqueLoanCode(
            product.productId,
            customer.customEmployeeId
        );

        const opsManager = await tx.associateSubAdmin.findFirst({
            where: { role: { roleName: "OPS_MANAGER" }, isActive: true, isDeleted: false },
        });

        const createdApplication = await tx.loanApplication.create({
            data: {
                customerId: customer.id,
                productId: masterProductId,
                loanCode,
                score: score ?? null,
                approverId: opsManager ? opsManager.id : null,
                customerStatus: "PENDING",
                internalStatus: "OPS_PENDING",
                loanStatus: "NOT_DISBURSED",
            },
        });

        const fieldValuesData = values.map((v) => ({
            applicationId: createdApplication.id,
            fieldId: v.fieldId,
            dropdownId: v.dropdownId || null,
            subFieldId: v.subFieldId || null,
            value: v.value ?? null,
        }));
        if (fieldValuesData.length) {
            await tx.loanFieldValue.createMany({ data: fieldValuesData });
        }

        if (opsManager) {
            await safeCreateAssignment(tx, createdApplication.id, opsManager.id, 1, true);
        }

        if (score != null) {
            const rules = await tx.loanAssignmentRule.findMany({
                where: { masterProductId, minScore: { lte: score }, maxScore: { gte: score } },
                orderBy: { chainOrder: "asc" },
            });
            for (let i = 0; i < rules.length; i++) {
                await safeCreateAssignment(tx, createdApplication.id, rules[i].creditManagerId, i + 2, i === 0);
                if (i === rules.length - 1) {
                    await tx.loanApplicationAssignment.updateMany({
                        where: { loanApplicationId: createdApplication.id, creditManagerId: rules[i].creditManagerId },
                        data: { blockedUntilOps: true },
                    });
                }
            }
        }

        await logLoanHistory(tx, createdApplication.id, customerId, "APPLIED", "Loan application submitted");

        return { createdApplication, assignedTo: opsManager ? opsManager.id : null };
    });

    res.respond(201, "Loan Application Submitted Successfully!", {
        loanApplicationId: createdApplication.id,
        customerId,
        masterProductId,
        assignedTo,
    });
});

// ##########----------Reject Loan By Operational Manager----------##########
const rejectLoanByOpsManager = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { remarks } = req.body;

    const opsManager = await prisma.associateSubAdmin.findFirst({
        where: { userId, role: { roleName: "OPS_MANAGER" }, isDeleted: false },
    });
    if (!opsManager) return res.respond(403, "Only Ops Managers can reject applications.");

    const application = await prisma.loanApplication.findFirst({
        where: { id: loanApplicationId, isDeleted: false },
    });
    if (!application) return res.respond(404, "Loan Application not found.");

    if (application.internalStatus !== "OPS_PENDING") {
        return res.respond(400, "Loan is already processed and cannot be rejected by Ops!");
    }

    await prisma.$transaction(async (tx) => {
        await tx.loanApplicationAssignment.updateMany({
            where: { loanApplicationId, creditManagerId: opsManager.id },
            data: { status: "REJECTED", remarks }
        });

        await tx.loanApplication.update({
            where: { id: loanApplicationId },
            data: {
                internalStatus: "REJECTED",
                customerStatus: "REJECTED",
                approverId: null
            },
        });

        await logLoanHistory(tx, loanApplicationId, userId, "REJECTED", remarks || "Rejected by Ops Manager");
    });

    res.respond(200, "Loan Application rejected by Ops Manager.");
});

// ##########----------Approve Loan Step----------##########
const approveLoanStep = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { decision, remarks } = req.body;

    const application = await prisma.loanApplication.findFirst({
        where: { id: loanApplicationId, isDeleted: false },
        include: {
            LoanApplicationAssignment: {
                orderBy: { sequenceOrder: 'asc' },
                include: { creditManager: { include: { role: true } } }
            }
        }
    });
    if (!application) return res.respond(404, "Loan Application not found!");

    const approver = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
        include: { role: true }
    });
    if (!approver) return res.respond(403, "Approver not found.");

    const currentStep = application.LoanApplicationAssignment.find(
        a => a.creditManagerId === approver.id && a.status === "PENDING"
    );
    if (!currentStep) return res.respond(403, "You are not authorised for this step or there is no pending assignment for you.");

    const result = await prisma.$transaction(async (tx) => {
        if (decision === "REJECT") {
            await tx.loanApplicationAssignment.update({
                where: { id: currentStep.id },
                data: { status: "REJECTED", remarks }
            });

            await tx.loanApplication.update({
                where: { id: loanApplicationId },
                data: {
                    internalStatus: "REJECTED",
                    customerStatus: "REJECTED",
                    approverId: null
                },
            });

            await logLoanHistory(tx, loanApplicationId, userId, "REJECTED", remarks || "Application rejected");

            return { action: "REJECTED" };
        }

        await tx.loanApplicationAssignment.update({
            where: { id: currentStep.id },
            data: { status: "APPROVED", remarks }
        });

        const nextStep = application.LoanApplicationAssignment.find(
            a => a.sequenceOrder === currentStep.sequenceOrder + 1
        );

        let newInternalStatus = application.internalStatus;

        if (!nextStep) {
            newInternalStatus = "AWAITING_OPS";
        } else if (nextStep.blockedUntilOps) {
            newInternalStatus = "AWAITING_OPS";
        } else {
            await tx.loanApplicationAssignment.update({ where: { id: nextStep.id }, data: { active: true } });
            newInternalStatus = "AWAITING_CM";
        }

        await tx.loanApplication.update({
            where: { id: loanApplicationId },
            data: {
                internalStatus: newInternalStatus,
                approverId: nextStep ? nextStep.creditManagerId : null,
            },
        });

        await logLoanHistory(tx, loanApplicationId, userId, "APPROVED", "Step approved");

        return { action: "APPROVED" };
    });

    return res.respond(200, `Step ${result.action} successfully!`);
});

// ##########----------OPS Approval to unblock last CM----------##########
const approveByOpsManager = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;

    const opsManager = await prisma.associateSubAdmin.findFirst({
        where: { userId, role: { roleName: "OPS_MANAGER" }, isDeleted: false },
    });
    if (!opsManager) return res.respond(403, "Only Ops Managers can approve.");

    const application = await prisma.loanApplication.findFirst({
        where: { id: loanApplicationId, isDeleted: false },
        include: { LoanApplicationAssignment: true },
    });
    if (!application) return res.respond(404, "Loan Application not found!");

    await prisma.$transaction(async (tx) => {
        await tx.loanApplicationAssignment.updateMany({
            where: { loanApplicationId, blockedUntilOps: true },
            data: { blockedUntilOps: false, active: true },
        });

        await tx.loanApplication.update({
            where: { id: loanApplicationId },
            data: { internalStatus: "AWAITING_CM" },
        });

        await logLoanHistory(tx, loanApplicationId, userId, "OPS_APPROVED", "OPS approved and unblocked last CM");
    });

    res.respond(200, "OPS approval done, last CM unblocked.");
});

// ##########----------Assign Loan To Senior Ops----------##########
const assignToSeniorOps = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;

    const user = await prisma.associateSubAdmin.findUnique({
        where: { userId },
        include: { role: true },
    });

    if (!user || user.role.roleName !== "OPS_MANAGER") {
        return res.respond(403, "Only Junior Ops can assign to Senior Ops.");
    }

    const seniorOps = await prisma.associateSubAdmin.findFirst({
        where: { role: { roleName: "SENIOR_OPS_MANAGER" }, isDeleted: false },
    });
    if (!seniorOps) return res.respond(404, "Senior Ops not found.");

    const application = await prisma.loanApplication.findFirst({ where: { id: loanApplicationId } });
    if (!application) return res.respond(404, "Loan Application not found.");
    if (["REJECTED"].includes(application.internalStatus)) {
        return res.respond(400, "Cannot assign rejected application.");
    }

    await prisma.loanApplication.update({
        where: { id: loanApplicationId },
        data: { approverId: seniorOps.id, internalStatus: "OPS_PENDING" },
    });

    await prisma.loanApplicationHistory.create({
            data: {
            loanApplicationId,
            action: "ASSIGNED_TO_SENIOR_OPS",
            performedById: userId,
            remarks: `Assigned to Senior Ops (${seniorOps.id})`,
        },
    });

    res.respond(200, "Loan assigned to Senior Ops.");
});

// ##########----------Approve By Senior Ops----------##########
const approveBySeniorOps = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { action, remarks } = req.body;

    if (!["REJECT", "APPROVE"].includes(action)) {
        return res.respond(400, "Invalid action. Use REJECT or APPROVE.");
    }

    const user = await prisma.associateSubAdmin.findUnique({
        where: { userId },
        include: { role: true },
    });
    if (!user || user.role.roleName !== "SENIOR_OPS_MANAGER") {
        return res.respond(403, "Only Senior Ops can perform this action.");
    }

    const application = await prisma.loanApplication.findFirst({ where: { id: loanApplicationId } });
    if (!application) return res.respond(404, "Loan Application not found.");

    if (action === "REJECT") {
        await prisma.loanApplication.update({
            where: { id: loanApplicationId },
            data: { internalStatus: "REJECTED", customerStatus: "REJECTED", approverId: user.id },
        });

        await logLoanHistory(prisma, loanApplicationId, userId, "REJECTED_BY_SENIOR_OPS", remarks || "Rejected by Senior Ops");
        return res.respond(200, "Loan Application rejected by Senior Ops.");
    }

    const finance = await prisma.associateSubAdmin.findFirst({
        where: { role: { roleName: "FINANCE_MANAGER" }, isDeleted: false },
    });
    if (!finance) return res.respond(404, "Finance Manager not found.");

    await prisma.loanApplication.update({
        where: { id: loanApplicationId },
        data: { approverId: finance.id, internalStatus: "AWAITING_FINANCE" },
    });

    await logLoanHistory(prisma, loanApplicationId, userId, "FORWARDED_TO_FINANCE", `Forwarded to finance (${finance.id})`);

    res.respond(200, "Loan approved by Senior Ops and assigned to Finance.");
});

// ##########----------Approve By Finance----------##########
const approveByFinance = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { action, remarks } = req.body;

    if (!["REJECT", "APPROVE"].includes(action)) {
        return res.respond(400, "Invalid action. Use REJECT or APPROVE.");
    }

    const user = await prisma.associateSubAdmin.findUnique({
        where: { userId },
        include: { role: true },
    });
    if (!user || user.role.roleName !== "FINANCE_MANAGER") {
        return res.respond(403, "Only Finance can perform this action.");
    }

    const application = await prisma.loanApplication.findFirst({ where: { id: loanApplicationId } });
    if (!application) return res.respond(404, "Loan Application not found.");

    if (action === "REJECT") {
        await prisma.loanApplication.update({
            where: { id: loanApplicationId },
            data: {
                internalStatus: "REJECTED",
                customerStatus: "REJECTED",
                approverId: user.id,
            },
        });

        await logLoanHistory(prisma, loanApplicationId, userId, "REJECTED_BY_FINANCE", remarks || "Rejected by Finance");
        return res.respond(200, "Loan Application rejected by Finance.");
    }

    await prisma.loanApplication.update({
        where: { id: loanApplicationId },
        data: {
            internalStatus: "APPROVED",
            customerStatus: "APPROVED",
            approverId: user.id,
        },
    });

    await logLoanHistory(prisma, loanApplicationId, userId, "APPROVED_BY_FINANCE", remarks || "Approved by Finance");

    res.respond(200, "Loan Application approved by Finance.");
});

// ##########----------Get Loans By Customer----------##########
const getLoansByCustomer = asyncHandler(async (req, res) => {
    const customerId = req.user;

    const customer = await prisma.employee.findFirst({
        where: { userId: customerId, isDeleted: false },
    });
    if (!customer) {
        return res.respond(404, "Customer not found.");
    }

    const loans = await prisma.loanApplication.findMany({
        where: { customerId: customer.id },
        include: {
            masterProduct: {
                select: {
                    productName: true,
                    productId: true,
                    productCode: true,
                    productDescription: true,
                }
            }
        },
        orderBy: { createdAt: "desc" },
    });

    res.respond(200, "Customer Loan Applications fetched successfully!", loans);
});

// ##########----------Get Loan Details By Customer----------##########
const getLoansDeatilsByCustomer = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { loanApplicationId } = req.params;

    const customer = await prisma.employee.findFirst({
        where: { userId: customerId, isDeleted: false },
    });
    if (!customer) {
        return res.respond(404, "Customer not found.");
    }

    const loans = await prisma.loanApplication.findFirst({
        where: { id: loanApplicationId, customerId: customer.id },
        include: {
            masterProduct: {
                select: {
                    id: true,
                    productId: true,
                    loanType: true,
                    productName: true,
                    productDescription: true,
                }
            }
        },
        orderBy: { createdAt: "desc" },
    });

    res.respond(200, "Customer Loan Applications fetched successfully!", loans);
});

// ##########----------Get Loan History By Customer----------##########
const getLoanHistoryByCustomer = asyncHandler(async (req, res) => {
    const customerId = req.user;

    const customer = await prisma.employee.findFirst({
        where: { userId: customerId, isDeleted: false },
    });
    if (!customer) {
        return res.respond(404, "Customer not found.");
    }

    const loans = await prisma.loanApplication.findMany({
        where: { customerId: customer.id, customerStatus: "CLOSED" },
        include: {
            masterProduct: {
                select: {
                    id: true,
                    productName: true,
                    productId: true,
                    productDescription: true,
                }
            }
        },
        orderBy: { createdAt: "desc" },
    });

    res.respond(200, "Customer Loan Applications fetched successfully!", loans);
});

// ##########----------Get Loans By Associate SubAdmin----------##########
const getLoansByAssociateSubadmin = asyncHandler(async (req, res) => {
    const userId = req.user;

    const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false, role: { roleName: { in: ["OPS_MANAGER", "SENIOR_OPS_MANAGER", "CREDIT_MANAGER"] } } },
        include: { role: true },
    });
    if (!associateSubAdmin) {
        return res.respond(403, "Associate SubAdmin not found or role not authorized.");
    }

    const loans = await prisma.loanApplication.findMany({
        where: {
            approverId: associateSubAdmin.id,
            internalStatus: { in: ["OPS_PENDING", "AWAITING_CM", "AWAITING_FINANCE"] },
        },
        include: {
            masterProduct: {
                select: {
                    productName: true,
                    productId: true,
                    productCode: true,
                    productDescription: true,
                }
            },
            fieldValues: {
                include: {
                    field: true,
                    dropdown: true,
                    subField: true,
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    if (!loans || loans.length === 0) {
        return res.respond(200, "No loans currently assigned to you", []);
    }

    res.respond(200, "Loan Applications fetched successfully!", loans);
});

// ##########----------Get Loans Logs----------##########
const getLoanLogs = asyncHandler(async (req, res) => {
    const { loanApplicationId } = req.params;

    if (!loanApplicationId) {
        return res.respond(400, "loanApplicationId is required");
    }

    const history = await prisma.loanApplicationHistory.findMany({
        where: { loanApplicationId },
        include: {
            performedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
        },
        orderBy: { createdAt: "asc" },
    });

    if (!history.length) {
        return res.respond(404, "No history found for this application");
    }

    return res.respond(200, "Loan history fetched successfully", history);
});

module.exports = {
    uploadDocs,
    applyLoan,
    rejectLoanByOpsManager,
    approveByOpsManager,
    approveLoanStep,
    assignToSeniorOps,
    approveBySeniorOps,
    approveByFinance,
    getLoansByCustomer,
    getLoansDeatilsByCustomer,
    getLoanHistoryByCustomer,
    getLoansByAssociateSubadmin,
    getLoanLogs
};
