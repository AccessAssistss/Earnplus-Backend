const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { generateUniqueLoanCode } = require("../../../utils/uniqueCodeGenerator");
const { logLoanHistory } = require("../../../helper/loanFunc");

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

    const customer = await prisma.employee.findFirst({
        where: { userId: customerId, isDeleted: false },
    });
    if (!customer) {
        return res.respond(404, "Customer not found.");
    }

    if (!masterProductId) {
        return res.respond(400, "Master Product Id is required!");
    }

    const exists = await prisma.masterProduct.findUnique({
        where: { id: masterProductId },
    });
    if (!exists) {
        return res.respond(404, "Master Product not found.");
    }

    if (!Array.isArray(values) || values.length === 0) {
        return res.respond(400, "Values must be a non-empty array.");
    }

    for (const v of values) {
        if (!v.fieldId) {
            return res.status(400).json({ message: "fieldId is required" });
        }

        if (v.subFieldId && !v.dropdownId) {
            return res.status(400).json({
                message: `subFieldId (${v.subFieldId}) cannot exist without dropdownId`,
            });
        }
    }

    const application = await prisma.$transaction(async (tx) => {
        const loanCode = await generateUniqueLoanCode(
            exists.productId,
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

        await tx.loanFieldValue.createMany({
            data: values.map((v) => ({
                applicationId: createdApplication.id,
                fieldId: v.fieldId,
                dropdownId: v.dropdownId || null,
                subFieldId: v.subFieldId || null,
                value: v.value || null,
            })),
        });

        if (opsManager) {
            await tx.loanApplicationAssignment.create({
                data: {
                    loanApplicationId: createdApplication.id,
                    creditManagerId: opsManager.id,
                    sequenceOrder: 1,
                    status: "PENDING"
                },
            });
        }

        await logLoanHistory(tx, createdApplication.id, customerId, "APPLIED", "Loan application submitted");

        return { createdApplication, opsManager };
    });

    res.respond(201, "Loan Application Submitted Successfully!", {
        loanApplicationId: application.createdApplication.id,
        customerId,
        masterProductId,
        assignedTo: application.opsManager ? application.opsManager.id : null,
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
    if (!opsManager) {
        return res.respond(403, "Only Ops Managers can reject applications!");
    }

    const application = await prisma.loanApplication.findFirst({
        where: { id: loanApplicationId, isDeleted: false },
    });
    if (!application) return res.respond(404, "Loan Application not found!");

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
    });

    res.respond(200, "Loan Application rejected by Ops Manager!");
});

// ##########----------Assign Loan To Credit Manager (Layering)----------##########
const assignLoanToCreditManager = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;

    const opsManager = await prisma.associateSubAdmin.findFirst({
        where: { userId, role: { roleName: "OPS_MANAGER" }, isDeleted: false },
    });
    if (!opsManager) {
        return res.respond(403, "Only Ops Managers can assign applications!");
    }

    const application = await prisma.loanApplication.findFirst({
        where: {
            id: loanApplicationId,
            isDeleted: false
        },
    });
    if (!application) return res.respond(404, "Loan Application not found!");
    if (application.score === null) return res.respond(400, "Application score is required for assignment.");

    const rules = await prisma.loanAssignmentRule.findMany({
        where: {
            minScore: { lte: application.score },
            maxScore: { gte: application.score },
        },
        include: { creditManager: true },
        orderBy: { chainOrder: "asc" },
    });

    if (rules.length === 0) {
        return res.respond(400, "No assignment rule found for this score range!");
    }

    await prisma.$transaction(async (tx) => {
        let sequence = 2;

        for (const rule of rules) {
            await tx.loanApplicationAssignment.create({
                data: {
                    loanApplicationId: application.id,
                    creditManagerId: rule.creditManagerId,
                    sequenceOrder: sequence++,
                    status: "PENDING"
                },
            });
        }

        const finance = await tx.associateSubAdmin.findFirst({
            where: { role: { roleName: "FINANCE_MANAGER" }, isActive: true, isDeleted: false },
        });
        if (finance) {
            await tx.loanApplicationAssignment.create({
                data: {
                    loanApplicationId: application.id,
                    creditManagerId: finance.id,
                    sequenceOrder: sequence,
                    status: "PENDING"
                },
            });
        }

        await tx.loanApplication.update({
            where: { id: application.id },
            data: {
                internalStatus: "CREDIT_ASSIGNED",
                approverId: rules.length > 0 ? rules[0].creditManagerId : null,
                customerStatus: "UNDER_REVIEW",
            },
        });

        await logLoanHistory(tx, application.id, userId, "ASSIGNED", "Application assigned to Credit Managers");
    });

    res.respond(200, "Application assigned to Credit Manager!", { loanApplicationId: application.id });
});

// ##########----------Approve Loan Step----------##########
const approveLoanStep = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { decision, remarks } = req.body;

    const application = await prisma.loanApplication.findFirst({
        where: { id: loanApplicationId },
        include: {
            LoanApplicationAssignment: {
                orderBy: { sequenceOrder: 'asc' },
                include: { creditManager: { include: { role: true } } }
            }
        }
    });
    if (!application) return res.respond(404, "Loan Application not found!");

    const creditManager = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!creditManager) {
        return res.respond(403, "Credit manager not found!");
    }

    const currentStep = application.LoanApplicationAssignment.find(
        a => a.creditManagerId === creditManager.id && a.isApproved === null
    );
    if (!currentStep) {
        return res.respond(403, "You are not authorized to act on this step!");
    }

    await prisma.$transaction(async (tx) => {
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

            return res.respond(200, "Loan Application rejected successfully!");
        }
        if (decision === "APPROVE") {
            await tx.loanApplicationAssignment.update({
                where: { id: currentStep.id },
                data: { isApproved: true }
            });

            const nextStep = application.LoanApplicationAssignment.find(
                a => a.sequenceOrder === currentStep.sequenceOrder + 1
            );

            let newInternalStatus = "APPROVAL_PENDING";
            let newCustomerStatus = application.customerStatus;

            if (!nextStep) {
                newInternalStatus = "APPROVED";
                newCustomerStatus = "APPROVED";
            } else if (nextStep.creditManager.role.roleName === "FINANCE_MANAGER") {
                newInternalStatus = "AWAITING_FINANCE";
            } else {
                newInternalStatus = "AWAITING_CM";
            }

            await tx.loanApplication.update({
                where: { id: loanApplicationId },
                data: {
                    internalStatus: newInternalStatus,
                    customerStatus: newCustomerStatus,
                    approverId: nextStep ? nextStep.creditManagerId : null,
                },
            });

            await logLoanHistory(tx, loanApplicationId, userId, "APPROVED", "Step approved");

            res.respond(200, "Step approved successfully!");
        }
    });
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
        where: { userId, isDeleted: false },
        include: {
            role: true,
        },
    });
    if (!associateSubAdmin) {
        return res.respond(403, "Associate SubAdmin not found.");
    }

    const loans = await prisma.loanApplication.findMany({
        where: {
            approverId: associateSubAdmin.id,
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
    assignLoanToCreditManager,
    approveLoanStep,
    getLoansByCustomer,
    getLoansDeatilsByCustomer,
    getLoanHistoryByCustomer,
    getLoansByAssociateSubadmin,
    getLoanLogs
};
