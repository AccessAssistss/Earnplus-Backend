const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Get Applied Loans----------##########
const getAppliedLoans = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { page = 1, limit = 10, search = "" } = req.query;

    const opsManager = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false, isActive: true },
        include: { role: true }
    });

    if (!opsManager || !["Ops", "Ops_Manager"].includes(opsManager.role.roleName)) {
        return res.respond(403, "Only Operations Managers can access this.");
    }

    const whereClause = {
        isDeleted: false,
        approverId: opsManager.id,
        internalStatus: "OPS_PENDING",
        vkycStatus: "NOT_INITIATED",
        OR: search ? [
            { loanCode: { contains: search, mode: 'insensitive' } },
            { employee: { employeeName: { contains: search, mode: 'insensitive' } } },
            { employee: { mobile: { contains: search, mode: 'insensitive' } } }
        ] : undefined
    };

    const [loans, totalCount] = await Promise.all([
        prisma.loanApplication.findMany({
            where: whereClause,
            include: {
                employee: {
                    select: {
                        id: true,
                        customEmployeeId: true,
                        employeeName: true,
                        email: true,
                        mobile: true,
                        employer: {
                            select: { id: true, name: true }
                        }
                    }
                },
                masterProduct: {
                    select: {
                        id: true,
                        productName: true,
                        productCode: true
                    }
                },
                LoanVkycData: true,
                LoanFormData: {
                    select: { id: true, formJsonData: true }
                }
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: parseInt(limit)
        }),
        prisma.loanApplication.count({ where: whereClause })
    ]);

    res.respond(200, "Newly applied loans fetched successfully!", {
        loans,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            limit: parseInt(limit)
        }
    });
});

// ##########----------Get VKYC Pending Loans----------##########
const getVKYCPendingLoans = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { page = 1, limit = 10, search = "", vkycStatus = "LINK_GENERATED" } = req.query;

    const opsManager = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false, isActive: true },
        include: { role: true }
    });

    if (!opsManager || !["Ops", "Ops_Manager"].includes(opsManager.role.roleName)) {
        return res.respond(403, "Only Operations Managers can access this.");
    }

    const whereClause = {
        isDeleted: false,
        approverId: opsManager.id,
        internalStatus: "OPS_PENDING",
        vkycStatus: vkycStatus || { in: ["LINK_GENERATED"] },
        OR: search ? [
            { loanCode: { contains: search, mode: 'insensitive' } },
            { employee: { employeeName: { contains: search, mode: 'insensitive' } } }
        ] : undefined
    };

    const [loans, totalCount] = await Promise.all([
        prisma.loanApplication.findMany({
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
                        productCode: true
                    }
                },
                LoanVkycData: true,
                LoanFormData: {
                    select: { id: true, formJsonData: true }
                }
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: parseInt(limit)
        }),
        prisma.loanApplication.count({ where: whereClause })
    ]);

    res.respond(200, "VKYC pending loans fetched successfully!", {
        loans,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            limit: parseInt(limit)
        }
    });
});

// ##########----------Get Manager's Loan Processing History----------##########
const getManagerLoanHistory = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { page = 1, limit = 10, status, dateFrom, dateTo } = req.query;

    const manager = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
        include: { role: true }
    });

    if (!manager) {
        return res.respond(404, "Manager not found!");
    }

    const whereClause = {
        performedById: manager.id,
        action: {
            in: [
                "ASSIGNED_TO_OPS",
                "ASSIGNED_TO_SENIOR_OPS",
                "ASSIGNED_TO_CREDIT",
                "ASSIGNED_TO_CREDIT_AUTO",
                "REASSIGNED_TO_CREDIT_LEVEL",
                "ESCALATED_TO_SENIOR_CREDIT",
                "ASSIGNED_TO_FINANCE",
                "ASSIGNED_TO_DISBURSAL",
                "REJECTED",
                "APPROVED"
            ]
        }
    };

    if (dateFrom || dateTo) {
        whereClause.createdAt = {};
        if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom);
        if (dateTo) whereClause.createdAt.lte = new Date(dateTo);
    }

    const [history, totalCount] = await Promise.all([
        prisma.loanApplicationLogs.findMany({
            where: whereClause,
            include: {
                loanApplication: {
                    include: {
                        employee: {
                            select: {
                                employeeName: true,
                                mobile: true,
                                customEmployeeId: true
                            }
                        },
                        masterProduct: {
                            select: {
                                productName: true,
                                productCode: true
                            }
                        }
                    }
                },
                assignedTo: {
                    select: {
                        name: true,
                        email: true,
                        role: { select: { roleName: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: parseInt(limit)
        }),
        prisma.loanApplicationLogs.count({ where: whereClause })
    ]);

    const stats = await prisma.loanApplicationLogs.groupBy({
        by: ['action'],
        where: { performedById: manager.id },
        _count: true
    });

    const statistics = {
        totalProcessed: totalCount,
        approved: stats.find(s => s.action === "APPROVED")?._count || 0,
        rejected: stats.find(s => s.action === "REJECTED")?._count || 0,
        forwarded: stats.filter(s => s.action.startsWith("ASSIGNED_")).reduce((sum, s) => sum + s._count, 0)
    };

    res.respond(200, "Manager history fetched successfully!", {
        statistics,
        history,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalCount,
            limit: parseInt(limit)
        }
    });
});

// ##########----------Get Manager's Dashboard Stats----------##########
const getManagerDashboardStats = asyncHandler(async (req, res) => {
    const userId = req.user;

    const manager = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
        include: { role: true }
    });

    if (!manager) {
        return res.respond(404, "Manager not found!");
    }

    const currentLoans = await prisma.loanApplication.findMany({
        where: {
            approverId: manager.id,
            isDeleted: false,
            customerStatus: { not: "REJECTED" }
        },
        select: {
            id: true,
            internalStatus: true,
            customerStatus: true,
            loanStatus: true
        }
    });

    const historicalActions = await prisma.loanApplicationLogs.groupBy({
        by: ['action'],
        where: { performedById: manager.id },
        _count: true
    });

    const statusBreakdown = {
        pending: currentLoans.filter(l => l.customerStatus === "UNDER_REVIEW").length,
        approved: currentLoans.filter(l => l.customerStatus === "APPROVED").length,
        disbursed: currentLoans.filter(l => l.loanStatus === "DISBURSED").length,
        active: currentLoans.filter(l => l.loanStatus === "ACTIVE").length
    };

    const actionBreakdown = {};
    historicalActions.forEach(action => {
        actionBreakdown[action.action] = action._count;
    });

    res.respond(200, "Dashboard stats fetched successfully!", {
        role: manager.role.roleName,
        currentLoansCount: currentLoans.length,
        statusBreakdown,
        historicalActions: actionBreakdown,
        totalProcessed: historicalActions.reduce((sum, a) => sum + a._count, 0)
    });
});

// ##########----------Get Loan Details with Full History----------##########
const getLoanDetails = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;

    const manager = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false }
    });

    if (!manager) {
        return res.respond(404, "Manager not found!");
    }

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
                    employer: {
                        select: { id: true, name: true }
                    }
                }
            },
            masterProduct: {
                select: {
                    id: true,
                    productName: true,
                    productCode: true,
                    productDescription: true
                }
            },
            approver: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: { select: { roleName: true } }
                }
            },
            LoanFormData: true,
            LoanOtherDocs: true,
            LoanVkycData: true,
            LoanCreditData: true,
            LoanApprovedData: true,
            LoanEmiDetails: true,
            LoanBankDetails: true,
            LoanEsignDocuments: true,
            // LoanApplicationLogs: {
            //     include: {
            //         performedBy: {
            //             select: {
            //                 id: true,
            //                 name: true,
            //                 email: true,
            //                 role: { select: { roleName: true } }
            //             }
            //         },
            //         assignedTo: {
            //             select: {
            //                 id: true,
            //                 name: true,
            //                 email: true,
            //                 role: { select: { roleName: true } }
            //             }
            //         }
            //     },
            //     orderBy: { createdAt: 'asc' }
            // }
        }
    });

    if (!loan) {
        return res.respond(404, "Loan not found");
    }

    res.respond(200, "Loan details with history fetched successfully", loan);
});

// ##########----------Ask Additional Docs For Loans----------##########
const askAdditionalDocs = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId, documents } = req.body;

    if (!loanApplicationId) {
        return res.respond(400, "Loan Application Id is required.");
    }

    if (!Array.isArray(documents) || documents.length === 0) {
        return res.respond(400, "At least one document is required.");
    }

    const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
        where: {
            userId,
            isDeleted: false,
            isActive: true
        },
        include: { role: true }
    });
    if (!associateSubAdmin) {
        return res.respond(403, "Unauthorized access.");
    }

    const loanApplication = await prisma.loanApplication.findFirst({
        where: {
            id: loanApplicationId,
            isDeleted: false
        }
    });

    if (!loanApplication) {
        return res.respond(404, "Loan application not found.");
    }

    const existingDocs = await prisma.loanOtherDocs.findMany({
        where: {
            applicationId: loanApplicationId,
            isDeleted: false,
            docName: {
                in: documents.map(d => d.docName)
            }
        },
        select: { docName: true }
    });

    const existingDocNames = new Set(existingDocs.map(d => d.docName));

    const docsToCreate = documents
        .filter(d => !existingDocNames.has(d.docName))
        .map(d => ({
            applicationId: loanApplicationId,
            docName: d.docName,
            status: "REQUESTED"
        }));

    if (docsToCreate.length === 0) {
        return res.respond(400, "All requested documents already exist.");
    }

    await prisma.$transaction(async (tx) => {
        await tx.loanOtherDocs.createMany({
            data: docsToCreate
        });
    });

    return res.respond(
        201,
        "Additional document request sent successfully.",
        {
            requestedDocs: docsToCreate.map(d => d.docName)
        }
    );
});

module.exports = {
    getAppliedLoans,
    getVKYCPendingLoans,
    getManagerLoanHistory,
    getManagerDashboardStats,
    getLoanDetails,
    askAdditionalDocs
};