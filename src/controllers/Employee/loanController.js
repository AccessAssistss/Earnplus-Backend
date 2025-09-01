const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

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
        where: { id: customerId, isDeleted: false },
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

        const createdApplication = await tx.loanApplication.create({
            data: { customerId, productId: masterProductId, loanCode, score: score ?? null, },
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

        const opsManager = await tx.associateSubAdmin.findFirst({
            where: { role: { roleName: "OPS_MANAGER" }, isActive: true, isDeleted: false },
        });

        if (opsManager) {
            await tx.loanApplicationAssignment.create({
                data: {
                    applicationId: createdApplication.id,
                    creditManagerId: opsManager.id,
                    sequenceOrder: 1,
                },
            });
        }

        return createdApplication;
    });

    res.respond(201, "Loan Application Submitted Successfully!", {
        loanApplicationId: application.id,
        customerId,
        masterProductId,
        assignedTo: opsManager ? opsManager.id : null,
    });
});

// ##########----------Assign Loan To Credit Manager (Layering)----------##########
const assignLoanToCreditManager = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;

    const opsManager = await prisma.associateSubAdmin.findFirst({
        where: { id: userId, role: "OPS_MANAGER", isDeleted: false },
    });
    if (!opsManager) {
        return res.respond(403, "Only Ops Managers can assign applications!");
    }

    const application = await prisma.loanApplication.findFirst({
        where: { id: loanApplicationId, isDeleted: false },
        include: { customer: true },
    });
    if (!application) return res.respond(404, "Loan Application not found!");
    if (application.status !== "OPS_REVIEWED") return res.respond(400, "Application must be OPS_REVIEWED before assignment.");
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
        let sequence = 2; // Ops Manager = 1, start CM chain from 2

        for (const rule of rules) {
            await tx.loanApplicationAssignment.create({
                data: {
                    applicationId: application.id,
                    creditManagerId: rule.creditManagerId,
                    sequenceOrder: sequence++,
                },
            });
        }

        // Optionally, add Finance Manager as final approver
        const finance = await tx.associateSubAdmin.findFirst({
            where: { role: { roleName: "FINANCE_MANAGER" }, isActive: true, isDeleted: false },
        });
        if (finance) {
            await tx.loanApplicationAssignment.create({
                data: {
                    applicationId: application.id,
                    creditManagerId: finance.id,
                    sequenceOrder: sequence,
                },
            });
        }

        // Update main application status
        await tx.loanApplication.update({
            where: { id: application.id },
            data: { status: "CREDIT_ASSIGNED" },
        });
    });

    res.respond(200, "Application assigned to Credit Manager!", { loanApplicationId: application.id });
});

// ##########----------Approve Loan Step----------##########
const approveLoanStep = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;

    // Find the application
    const application = await prisma.loanApplication.findFirst({
        where: { id: loanApplicationId },
        include: {
            assignments: { orderBy: { sequenceOrder: 'asc' } } // fetch all steps
        }
    });

    if (!application) return res.respond(404, "Loan Application not found!");

    // Find current step for this approver
    const currentStep = application.assignments.find(
        a => a.creditManagerId === userId && a.isApproved === null
    );

    if (!currentStep) {
        return res.respond(403, "You are not authorized to approve this step or step already approved!");
    }

    await prisma.$transaction(async (tx) => {
        // Approve current step
        await tx.loanApplicationAssignment.update({
            where: { id: currentStep.id },
            data: { isApproved: true }
        });

        // Find next step
        const nextStep = application.assignments.find(
            a => a.sequenceOrder === currentStep.sequenceOrder + 1
        );

        // Update LoanApplication status based on next approver
        let newStatus = "APPROVAL_PENDING";
        if (!nextStep) {
            // No next step → all approvals done
            newStatus = "APPROVED";
        } else {
            // Optionally, you can set statuses per role
            newStatus = `AWAITING_${nextStep.creditManager.role.roleName}`;
        }

        await tx.loanApplication.update({
            where: { id: loanApplicationId },
            data: { status: newStatus, approverId: nextStep ? nextStep.creditManagerId : null }
        });
    });

    res.respond(200, "Step approved successfully!");
});

// ##########----------Get Loans By Customer----------##########
const getLoansByCustomer = asyncHandler(async (req, res) => {
    const customerId = req.user;

    const customer = await prisma.employee.findFirst({
        where: { id: customerId, isDeleted: false },
    });
    if (!customer) {
        return res.respond(404, "Customer not found.");
    }

    const loans = await prisma.loanApplication.findMany({
        where: { customerId },
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

    res.respond(200, "Loan Applications fetched successfully!", loans);
});

module.exports = {
    uploadDocs,
    applyLoan,
    assignLoanToCreditManager,
    approveLoanStep,
    getLoansByCustomer,
    getLoansByAssociateSubadmin
};
