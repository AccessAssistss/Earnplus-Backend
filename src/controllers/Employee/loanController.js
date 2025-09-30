const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { generateUniqueLoanCode } = require("../../../utils/uniqueCodeGenerator");
const { logLoanHistory, safeCreateAssignment } = require("../../../helper/loanFunc");

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
        const loanCode = await generateUniqueLoanCode(
            product.productId,
            customer.customEmployeeId
        );

        const createdApplication = await tx.loanApplication.create({
            data: {
                customerId: customer.id,
                productId: masterProductId,
                loanCode,
                score: score ?? null,
                customerStatus: "PENDING",
                internalStatus: "OPS_PENDING",
                loanStatus: "NOT_DISBURSED",
                opsApproved: false,
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

        const opsManager = await tx.associateSubAdmin.findFirst({
            where: { 
                role: { roleName: "OPS_MANAGER" }, 
                isActive: true, 
                isDeleted: false 
            },
        });

        const assignments = [];
        let sequenceOrder = 1;

        if (opsManager) {
            assignments.push({
                loanApplicationId: createdApplication.id,
                creditManagerId: opsManager.id,
                sequenceOrder: sequenceOrder++,
                status: "PENDING",
                active: true,
                blockedUntilOps: false
            });
        }

        if (score != null) {
            const rules = await tx.productCreditAssignmentRule.findMany({
                where: {
                    masterProductId,
                    minScore: { lte: score },
                    maxScore: { gte: score },
                    isDeleted: false
                },
                orderBy: { chainOrder: "asc" },
            });

            if (rules.length > 0) {
                const startingRule = rules[0];
                
                for (let i = 0; i < rules.length; i++) {
                    const rule = rules[i];
                    const isStartingCM = i === 0;
                    const isLastCM = i === rules.length - 1;
                    
                    assignments.push({
                        loanApplicationId: createdApplication.id,
                        creditManagerId: rule.creditManagerId,
                        sequenceOrder: sequenceOrder++,
                        status: "PENDING",
                        active: isStartingCM,
                        blockedUntilOps: isLastCM
                    });
                }
            }
        }

        if (assignments.length > 0) {
            await tx.loanApplicationAssignment.createMany({ data: assignments });
        }

        await logLoanHistory(
            tx, 
            createdApplication.id, 
            customerId, 
            "APPLIED", 
            "Loan application submitted"
        );

        return createdApplication;
    });

    res.respond(201, "Loan Application Submitted Successfully!", {
        loanApplicationId: result.id,
        loanCode: result.loanCode
    });
});

// ##########----------Unified Approval Controller----------##########
const processLoanApproval = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { decision, remarks } = req.body;

    if (!["APPROVE", "REJECT"].includes(decision)) {
        return res.respond(400, "Decision must be APPROVE or REJECT");
    }

    const approver = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
        include: { role: true }
    });
    if (!approver) return res.respond(403, "Approver not found.");

    const application = await prisma.loanApplication.findFirst({
        where: { id: loanApplicationId, isDeleted: false },
        include: {
            masterProduct: {
                include: {
                    ProductCreditAssignmentRule: {
                        where: { isDeleted: false },
                        orderBy: { chainOrder: 'asc' }
                    }
                }
            },
            LoanApplicationAssignment: {
                orderBy: { sequenceOrder: 'asc' },
                include: { 
                    creditManager: { 
                        include: { role: true } 
                    } 
                }
            }
        }
    });
    if (!application) return res.respond(404, "Loan Application not found!");

    const currentAssignment = application.LoanApplicationAssignment.find(
        a => a.creditManagerId === approver.id && 
            a.status === "PENDING" && 
            a.active
    );

    if (!currentAssignment) {
        const blockedAssignment = application.LoanApplicationAssignment.find(
            a => a.creditManagerId === approver.id && 
                a.status === "PENDING" && 
                a.blockedUntilOps
        );
        
        if (blockedAssignment && !application.opsApproved) {
            return res.respond(403, "Waiting for OPS approval before you can act.");
        }
        
        return res.respond(403, "No active assignment for you on this application.");
    }

    const result = await prisma.$transaction(async (tx) => {
        const roleName = approver.role.roleName;

        if (decision === "REJECT") {
            await tx.loanApplicationAssignment.update({
                where: { id: currentAssignment.id },
                data: { 
                    status: "REJECTED", 
                    remarks,
                    active: false 
                }
            });

            await tx.loanApplicationAssignment.updateMany({
                where: { 
                    loanApplicationId,
                    status: "PENDING",
                    id: { not: currentAssignment.id }
                },
                data: { active: false }
            });

            await tx.loanApplication.update({
                where: { id: loanApplicationId },
                data: {
                    internalStatus: "REJECTED",
                    customerStatus: "REJECTED"
                }
            });

            await logLoanHistory(
                tx, 
                loanApplicationId, 
                userId, 
                "REJECTED", 
                remarks || `Rejected by ${roleName}`
            );

            return { message: `Loan Application rejected by ${roleName}.` };
        }

        await tx.loanApplicationAssignment.update({
            where: { id: currentAssignment.id },
            data: { 
                status: "APPROVED", 
                remarks,
                active: false
            }
        });

        let nextStep = null;

        if (roleName === "OPS_MANAGER") {
            await tx.loanApplication.update({
                where: { id: loanApplicationId },
                data: { opsApproved: true }
            });

            const blockedCM = application.LoanApplicationAssignment.find(
                a => a.blockedUntilOps && 
                     a.status === "PENDING" &&
                     a.creditManager.role.roleName.startsWith("CM")
            );

            if (blockedCM) {
                const cmAssignments = application.LoanApplicationAssignment
                    .filter(a => a.creditManager.role.roleName.startsWith("CM"))
                    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

                const blockedIndex = cmAssignments.findIndex(a => a.id === blockedCM.id);
                const allPreviousApproved = cmAssignments
                    .slice(0, blockedIndex)
                    .every(a => a.status === "APPROVED");

                if (allPreviousApproved) {
                    await tx.loanApplicationAssignment.update({
                        where: { id: blockedCM.id },
                        data: { 
                            blockedUntilOps: false,
                            active: true
                        }
                    });
                    nextStep = `${blockedCM.creditManager.role.roleName} activated for approval`;
                }
            }

            const allCMsApproved = application.LoanApplicationAssignment
                .filter(a => a.creditManager.role.roleName.startsWith("CM"))
                .every(a => a.status === "APPROVED");

            if (allCMsApproved) {
                await moveToSeniorOps(tx, loanApplicationId, application);
                nextStep = "All approvals complete. Moved to Senior OPS";
            }

            await logLoanHistory(
                tx, 
                loanApplicationId, 
                userId, 
                "OPS_APPROVED", 
                "OPS Manager approved"
            );

        } else if (roleName.startsWith("CM")) {
            const cmAssignments = application.LoanApplicationAssignment
                .filter(a => a.creditManager.role.roleName.startsWith("CM"))
                .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

            const currentIndex = cmAssignments.findIndex(a => a.id === currentAssignment.id);
            const nextCM = cmAssignments[currentIndex + 1];

            if (nextCM && nextCM.status === "PENDING") {
                if (nextCM.blockedUntilOps && !application.opsApproved) {
                    nextStep = `Waiting for OPS approval before ${nextCM.creditManager.role.roleName} can act`;
                } else {
                    await tx.loanApplicationAssignment.update({
                        where: { id: nextCM.id },
                        data: { active: true }
                    });
                    nextStep = `Forwarded to ${nextCM.creditManager.role.roleName}`;
                }
            } else {
                const opsAssignment = application.LoanApplicationAssignment.find(
                    a => a.creditManager.role.roleName === "OPS_MANAGER"
                );

                if (opsAssignment?.status === "APPROVED") {
                    await moveToSeniorOps(tx, loanApplicationId, application);
                    nextStep = "All approvals complete. Moved to Senior OPS";
                } else {
                    nextStep = "CM chain complete. Waiting for OPS approval to proceed";
                }
            }

            await logLoanHistory(
                tx, 
                loanApplicationId, 
                userId, 
                `${roleName}_APPROVED`, 
                `${roleName} approved`
            );
        }
        else if (roleName === "SENIOR_OPS_MANAGER") {
            await moveToFinance(tx, loanApplicationId, application);
            nextStep = "Forwarded to Finance Manager";
            
            await logLoanHistory(
                tx, 
                loanApplicationId, 
                userId, 
                "SENIOR_OPS_APPROVED", 
                "Senior OPS approved"
            );
        }
        else if (roleName === "FINANCE_MANAGER") {
            await tx.loanApplication.update({
                where: { id: loanApplicationId },
                data: {
                    internalStatus: "APPROVED",
                    customerStatus: "APPROVED"
                }
            });

            nextStep = "Loan fully approved and ready for disbursement";
            
            await logLoanHistory(
                tx, 
                loanApplicationId, 
                userId, 
                "FINANCE_APPROVED", 
                "Finance approved - Loan fully approved"
            );
        }

        return { 
            message: `${roleName} approved successfully.`,
            nextStep 
        };
    });

    res.respond(200, result.message, { nextStep: result.nextStep });
});

// ##########----------Move to Senior Operation Manager Function----------##########
async function moveToSeniorOps(tx, loanApplicationId, application) {
    const seniorOps = await tx.associateSubAdmin.findFirst({
        where: { 
            role: { roleName: "SENIOR_OPS_MANAGER" }, 
            isActive: true, 
            isDeleted: false 
        }
    });

    if (seniorOps) {
        const maxSequence = Math.max(
            ...application.LoanApplicationAssignment.map(a => a.sequenceOrder)
        );

        await tx.loanApplicationAssignment.create({
            data: {
                loanApplicationId,
                creditManagerId: seniorOps.id,
                sequenceOrder: maxSequence + 1,
                status: "PENDING",
                active: true,
                blockedUntilOps: false
            }
        });

        await tx.loanApplication.update({
            where: { id: loanApplicationId },
            data: { internalStatus: "OPS_PENDING" }
        });
    }
}

// ##########----------Move to Finance Manager Function----------##########
async function moveToFinance(tx, loanApplicationId, application) {
    const finance = await tx.associateSubAdmin.findFirst({
        where: { 
            role: { roleName: "FINANCE_MANAGER" }, 
            isActive: true, 
            isDeleted: false 
        }
    });

    if (finance) {
        const maxSequence = Math.max(
            ...application.LoanApplicationAssignment.map(a => a.sequenceOrder)
        );

        await tx.loanApplicationAssignment.create({
            data: {
                loanApplicationId,
                creditManagerId: finance.id,
                sequenceOrder: maxSequence + 1,
                status: "PENDING",
                active: true,
                blockedUntilOps: false
            }
        });

        await tx.loanApplication.update({
            where: { id: loanApplicationId },
            data: { internalStatus: "AWAITING_FINANCE" }
        });
    }
}

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
    // Main workflow controllers
    applyLoan,
    processLoanApproval,
    getMyPendingLoans,
    getLoanLogs,
    
    // Customer specific controllers
    getLoanHistoryByCustomer,
    getLoansByCustomer,
    getLoansDeatilsByCustomer,
    uploadDocs,
};