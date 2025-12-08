const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { generateUniqueLoanCode } = require("../../../utils/uniqueCodeGenerator");
const { logLoanHistory, safeCreateAssignment } = require("../../../helper/loanFunc");
const { selectOpsManager } = require("../../../helper/selectOpsManager");

const prisma = new PrismaClient();

// ##########----------Apply Loan (Customer)----------##########
const applyLoan = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { masterProductId } = req.params;
    const { values, score } = req.body;

    if (!masterProductId) return res.respond(400, "Master Product Id is required.");
    if (!Array.isArray(values) || values.length === 0) {
        return res.respond(400, "Values must be a non-empty array.");
    }

    const customer = await prisma.employee.findFirst({
        where: { userId: customerId, isDeleted: false },
    });
    if (!customer) return res.respond(404, "Customer not found.");

    const product = await prisma.masterProduct.findUnique({
        where: { id: masterProductId },
    });
    if (!product) return res.respond(404, "Master Product not found.");

    const result = await prisma.$transaction(async (tx) => {
        const selectedOps = await selectOpsManager(tx);

        const loanCode = await generateUniqueLoanCode(
            product.productId,
            customer.customEmployeeId
        );

        const createdApplication = await tx.loanApplication.create({
            data: {
                customerId: customer.id,
                productId: masterProductId,
                approverId: selectedOps.id,
                loanCode,
                score: score ?? null,
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

        return createdApplication;
    });

    res.respond(201, "Loan Application Submitted Successfully!", {
        loanApplicationId: result.id,
        loanCode: result.loanCode
    });
});

// ##########----------Get My Pending Loans (For Approvers)----------##########
const getMyPendingLoans = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { page = 1, limit = 10, status = "PENDING" } = req.query;

    const approver = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false, isActive: true },
        include: { role: true }
    });
    if (!approver) {
        return res.respond(403, "Approver not found or not active.");
    }

    const whereClause = {
        isDeleted: false,
        LoanApplicationAssignment: {
            some: {
                creditManagerId: approver.id,
                status: status,
                active: true
            }
        }
    };

    if (approver.role.roleName.startsWith("CM")) {
        whereClause.LoanApplicationAssignment.some = {
            creditManagerId: approver.id,
            status: status,
            active: true,
            OR: [
                { blockedUntilOps: false },
                {
                    blockedUntilOps: true,
                    loanApplication: { opsApproved: true }
                }
            ]
        };
    }

    const totalCount = await prisma.loanApplication.count({ where: whereClause });

    const loans = await prisma.loanApplication.findMany({
        where: whereClause,
        include: {
            employee: {
                select: {
                    id: true,
                    customEmployeeId: true,
                    employeeName: true,
                    email: true,
                    mobile: true
                }
            },
            masterProduct: {
                select: {
                    id: true,
                    productName: true,
                    productId: true,
                    productCode: true
                }
            },
            LoanApplicationAssignment: {
                where: {
                    creditManagerId: approver.id
                },
                select: {
                    id: true,
                    sequenceOrder: true,
                    blockedUntilOps: true,
                    active: true,
                    status: true,
                    remarks: true
                }
            }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: parseInt(limit)
    });

    const loansWithStatus = loans.map(loan => {
        const assignment = loan.LoanApplicationAssignment[0];
        return {
            ...loan,
            canApprove: assignment.active &&
                assignment.status === "PENDING" &&
                (!assignment.blockedUntilOps || loan.opsApproved),
            waitingForOps: assignment.blockedUntilOps && !loan.opsApproved
        };
    });

    res.respond(200, "Loans fetched successfully!", {
        loans: loansWithStatus,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            limit: parseInt(limit)
        },
        role: approver.role.roleName
    });
});

// ##########----------Get Loan Details with History----------##########
const getLoanLogs = asyncHandler(async (req, res) => {
    const { loanApplicationId } = req.params;

    const loan = await prisma.loanApplication.findFirst({
        where: { id: loanApplicationId },
        include: {
            employee: true,
            masterProduct: true,
            LoanApplicationAssignment: {
                include: {
                    creditManager: {
                        include: { role: true }
                    }
                },
                orderBy: { sequenceOrder: 'asc' }
            },
            LoanApplicationHistory: {
                include: {
                    performedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'asc' }
            },
            fieldValues: {
                include: {
                    field: true,
                    dropdown: true,
                    subField: true
                }
            }
        }
    });

    if (!loan) {
        return res.respond(404, "Loan not found");
    }

    const workflowStatus = loan.LoanApplicationAssignment.map(assignment => ({
        role: assignment.creditManager.role.roleName,
        status: assignment.status,
        active: assignment.active,
        blockedUntilOps: assignment.blockedUntilOps,
        remarks: assignment.remarks,
        creditManager: assignment.creditManager.name,
        sequenceOrder: assignment.sequenceOrder
    }));

    res.respond(200, "Loan details fetched successfully", {
        ...loan,
        workflowStatus
    });
});

// ##########----------Customer Controllers----------##########
const getLoanHistoryByCustomer = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { status } = req.query;

    const customer = await prisma.employee.findFirst({
        where: { userId: customerId, isDeleted: false },
    });
    if (!customer) {
        return res.respond(404, "Customer not found.");
    }

    const whereClause = { customerId: customer.id };

    if (status === "CLOSED") {
        whereClause.customerStatus = "CLOSED";
    }

    const loans = await prisma.loanApplication.findMany({
        where: whereClause,
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

    const loan = await prisma.loanApplication.findFirst({
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
            },
            LoanApplicationHistory: {
                orderBy: { createdAt: 'desc' },
                take: 10
            }
        }
    });

    if (!loan) {
        return res.respond(404, "Loan application not found.");
    }

    res.respond(200, "Loan details fetched successfully!", loan);
});

// ##########----------Upload Documents----------##########
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

module.exports = {
    applyLoan,
    getMyPendingLoans,
    getLoanLogs,
    getLoanHistoryByCustomer,
    getLoansByCustomer,
    getLoansDeatilsByCustomer,
    uploadDocs,
};