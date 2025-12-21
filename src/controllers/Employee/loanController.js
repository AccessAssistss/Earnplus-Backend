const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { generateUniqueLoanCode } = require("../../../utils/uniqueCodeGenerator");
const { selectOpsManager } = require("../../../helper/selectOpsManager");

const prisma = new PrismaClient();

// ##########----------Apply Loan (Customer)----------##########
const applyLoan = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { masterProductId } = req.params;
    const { formJsonData, score } = req.body;

    if (!masterProductId) return res.respond(400, "Master Product Id is required.");
    if (!formJsonData || typeof formJsonData !== 'object') {
        return res.respond(400, "Form data is required and must be an object.");
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

        await tx.loanFormData.create({
            data: {
                applicationId: createdApplication.id,
                formJsonData: formJsonData,
            },
        });

        await tx.loanApplicationLogs.create({
            data: {
                loanApplicationId: createdApplication.id,
                performedById: selectedOps.id,
                action: "LOAN_APPLICATION_SUBMITTED",
                remarks: "Loan application submitted by customer",
            },
        });

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
    const { page = 1, limit = 10 } = req.query;

    const approver = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false, isActive: true },
        include: { role: true }
    });
    if (!approver) {
        return res.respond(403, "Approver not found or not active.");
    }

    const whereClause = {
        isDeleted: false,
        approverId: approver.id,
    };

    if (internalStatus) {
        whereClause.internalStatus = internalStatus;
    } else {
        if (approver.role.roleName === "Ops_Manager") {
            whereClause.internalStatus = "OPS_PENDING";
        } else if (approver.role.roleName.startsWith("CM")) {
            whereClause.internalStatus = "CREDIT_PENDING";
            whereClause.opsApproved = true;
        }
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
            LoanFormData: {
                select: {
                    id: true,
                    formJsonData: true,
                }
            }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: parseInt(limit)
    });

    res.respond(200, "Loans fetched successfully!", {
        loans,
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
            employee: {
                select: {
                    id: true,
                    customEmployeeId: true,
                    employeeName: true,
                    email: true,
                    mobile: true,
                }
            },
            masterProduct: {
                select: {
                    id: true,
                    productName: true,
                    productId: true,
                    productCode: true,
                    productDescription: true,
                }
            },
            approver: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: {
                        select: {
                            roleName: true,
                        }
                    }
                }
            },
            LoanFormData: true,
            LoanVkycData: true,
            LoanCrifReport: true,
            LoanApplicationLogs: {
                include: {
                    performedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: {
                                select: {
                                    roleName: true,
                                }
                            }
                        }
                    },
                    assignedTo: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: {
                                select: {
                                    roleName: true,
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!loan) {
        return res.respond(404, "Loan not found");
    }

    res.respond(200, "Loan details fetched successfully", loan);
});

// ##########----------Customer Controllers----------##########
const getLoanHistoryByCustomer = asyncHandler(async (req, res) => {
    const customerId = req.user;
    const { customerStatus } = req.query;

    const customer = await prisma.employee.findFirst({
        where: { userId: customerId, isDeleted: false },
    });
    if (!customer) {
        return res.respond(404, "Customer not found.");
    }

    const whereClause = {
        customerId: customer.id,
        isDeleted: false
    };

    if (customerStatus) {
        whereClause.customerStatus = customerStatus;
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
        LoanFormData: {
            select: {
                id: true,
                formJsonData: true,
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
            LoanFormData: true,
            LoanVkycData: {
                select: {
                    id: true,
                    vkycPdf: true,
                    createdAt: true,
                }
            },
            LoanApplicationLogs: {
                include: {
                    performedBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    }
                },
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