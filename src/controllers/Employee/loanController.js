const { asyncHandler } = require("../../../utils/asyncHandler")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient();

// ##########----------Apply Loan----------##########
const applyLoan = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { productId, loanAmount, tenureMonths, emiStartDate, loanPurpose, incomeSource, existingLoanCount, isCoApplicant, isGuarantor } = req.body;
    if (!productId || !loanAmount || !tenureMonths || !emiStartDate || !loanPurpose || !incomeSource || existingLoanCount === undefined || isCoApplicant === undefined || isGuarantor === undefined) {
        return res.respond(400, "All fields required!")
    }

    const user = await prisma.customUser.findUnique({ where: { id: userId } });
    if (!user) return res.respond(404, "User not found");

    const customer = await prisma.employee.findFirst({
        where: { userId: user.id },
    });
    if (!customer) {
        return res.respond(404, "Customer not found!");
    }

    const variant = await prisma.variantProduct.findUnique({
        where: { id: productId }
    });
    if (!variant) return res.respond(404, "Variant product not found");

    const loanID = await generateLoanID(variant.variantId);

    const loanApplication = await prisma.loanApplication.create({
        data: {
            customerId: customer.id,
            productId,
            loanID,
            loanAmount,
            tenureMonths,
            emiStartDate: new Date(emiStartDate),
            loanPurpose,
            incomeSource,
            existingLoanCount,
            isCoApplicant,
            isGuarantor
        },
    });

    return res.respond(201, "Loan application submitted successfully", loanApplication);
});

// ##########----------Approve Customer Documents----------##########
const approveCustomerDocuments = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { documentName, status, loanId } = req.body;

    const operationalManager = prisma.associateSubAdmin.findUnique({
        where: { userId, isDeleted: false },
        include: { role: true }
    })
    if (!operationalManager || operationalManager.role.roleName != "Operational Manager") {
        return res.respond(404, "operational manager not found!")
    }

    if (documentName == "aadharFront") {
        const updateAadharFront = prisma.loanKYCDetails.update({
            where: { loanApplicationId: loanId },
            data: {
                aadharFrontStatus: status
            }
        })
    } else if (documentName == "aadharBack") {
        const updateAadharBack = prisma.loanKYCDetails.update({
            where: { loanApplicationId: loanId },
            data: {
                aadharBackStatus: status
            }
        })
    } else if (documentName == "pancard") {
        const updatepancard = prisma.loanKYCDetails.update({
            where: { loanApplicationId: loanId },
            data: {
                pancardStatus: status
            }
        })
    } else if (documentName == "photo") {
        const updateCustomerPhoto = prisma.loanKYCDetails.update({
            where: { loanApplicationId: loanId },
            data: {
                customerPhotoStatus: status
            }
        })
    } else if (documentName == "videoKYC") {
        const updateVideoKYC = prisma.loanKYCDetails.update({
            where: { loanApplicationId: loanId },
            data: {
                videoKycStatus: status
            }
        })
    }

    return res.respond(200, `${documentName} verified successfully!`)
})

// ##########----------Approve Co-Applicant Documents----------##########
const approveCoapplicantDocuments = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { documentName, status, coapplicantId } = req.body;

    const operationalManager = prisma.associateSubAdmin.findUnique({
        where: { userId, isDeleted: false },
        include: { role: true }
    })
    if (!operationalManager || operationalManager.role.roleName != "Operational Manager") {
        return res.respond(404, "operational manager not found!")
    }

    if (documentName == "aadharFront") {
        const updateAadharFront = prisma.coApplicantKYCDetails.update({
            where: { coApplicantId: coapplicantId },
            data: {
                aadharFrontStatus: status
            }
        })
    } else if (documentName == "aadharBack") {
        const updateAadharBack = prisma.coApplicantKYCDetails.update({
            where: { coApplicantId: coapplicantId },
            data: {
                aadharBackStatus: status
            }
        })
    } else if (documentName == "pancard") {
        const updatepancard = prisma.coApplicantKYCDetails.update({
            where: { coApplicantId: coapplicantId },
            data: {
                pancardStatus: status
            }
        })
    } else if (documentName == "photo") {
        const updateCustomerPhoto = prisma.coApplicantKYCDetails.update({
            where: { coApplicantId: coapplicantId },
            data: {
                customerPhotoStatus: status
            }
        })
    } else if (documentName == "videoKYC") {
        const updateVideoKYC = prisma.coApplicantKYCDetails.update({
            where: { coApplicantId: coapplicantId },
            data: {
                videoKycStatus: status
            }
        })
    }

    return res.respond(200, `${documentName} verified successfully!`)
})

// ##########----------Approve Guarantor Documents----------##########
const approveGuarantorDocuments = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { documentName, status, guarantorId } = req.body;

    const operationalManager = prisma.associateSubAdmin.findUnique({
        where: { userId, isDeleted: false },
        include: { role: true }
    })
    if (!operationalManager || operationalManager.role.roleName != "Operational Manager") {
        return res.respond(404, "operational manager not found!")
    }

    if (documentName == "aadharFront") {
        const updateAadharFront = prisma.guarantorKYCDetails.update({
            where: { guarantorId: guarantorId },
            data: {
                aadharFrontStatus: status
            }
        })
    } else if (documentName == "aadharBack") {
        const updateAadharBack = prisma.guarantorKYCDetails.update({
            where: { guarantorId: guarantorId },
            data: {
                aadharBackStatus: status
            }
        })
    } else if (documentName == "pancard") {
        const updatepancard = prisma.guarantorKYCDetails.update({
            where: { guarantorId: guarantorId },
            data: {
                pancardStatus: status
            }
        })
    } else if (documentName == "photo") {
        const updateCustomerPhoto = prisma.guarantorKYCDetails.update({
            where: { guarantorId: guarantorId },
            data: {
                customerPhotoStatus: status
            }
        })
    } else if (documentName == "videoKYC") {
        const updateVideoKYC = prisma.guarantorKYCDetails.update({
            where: { guarantorId: guarantorId },
            data: {
                videoKycStatus: status
            }
        })
    }

    return res.respond(200, `${documentName} verified successfully!`)
})

// ##########----------Approve Loan To Credit Manager----------##########
const approveLoanToCreditManager = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanId, status } = req.body;

    const operationalManager = prisma.associateSubAdmin.findUnique({
        where: { userId, isDeleted: false },
        include: { role: true }
    })
    if (!operationalManager || operationalManager.role.roleName != "Operational Manager") {
        return res.respond(404, "operational manager not found!")
    }

    const updateLoanStatus = prisma.loanApplication.update({
        where: { id: loanId },
        data: {
            loanStatus: status
        }
    })

    return res.respond(200, "loan Status updated successfully!", updateLoanStatus)
})

// ##########----------Get All Loans----------##########
const getAllLoans = asyncHandler(async (req, res) => {
    const userId = req.user;

    const operationalManager = await prisma.associateSubAdmin.findUnique({
        where: { userId, isDeleted: false },
        include: {
            role: true
        }
    })
    if (!operationalManager || operationalManager.role.roleName != "Operational Manager") {
        return res.respond(404, "Operational Manager not found!")
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit

    const [loanApplications, totalCount] = await Promise.all([
        prisma.loanApplication.findMany({
            where: {
                isDeleted: false,
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        employeeId: true,
                        employeeName: true,
                        mobile: true,
                    },
                },
                variantProduct: {
                    select: {
                        id: true,
                        variantId: true,
                    },
                },
            },
        }),
        prisma.loanApplication.count({
            where: {
                isDeleted: false,
            },
        }),
    ]);

    return res.respond(200, "Loan Applications fetched successfully!", {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        loans: loanApplications,
    })
});

// ##########----------Get Loan Details----------##########
const getLoanDetails = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanId } = req.params;

    const operationalManager = await prisma.associateSubAdmin.findUnique({
        where: { userId, isDeleted: false },
        include: {
            role: true
        }
    })
    if (!operationalManager || operationalManager.role.roleName != "Operational Manager") {
        return res.respond(404, "Operational Manager not found!")
    }

    const loanApplicationDetails = await prisma.loanApplication.findUnique({
        where: {
            id: loanId,
        },
        include: {
            customer: {
                select: {
                    id: true,
                    employeeId: true,
                    employeeName: true,
                    mobile: true,
                },
            },
            variantProduct: {
                select: {
                    id: true,
                    variantId: true,
                    variantName: true
                },
            },
        },
        kycDetails: {
            select: {
                id: true,
                pancard: true,
                aadharFront: true,
                aadharBack: true,
                customerPhoto: true,
                videoKycStatus: true,
                pancardStatus: true,
                aadharFrontStatus: true,
                aadharBackStatus: true,
                customerPhotoStatus: true,
                createdAt: true,
            }
        }
    })

    if (!loanApplicationDetails || loanApplicationDetails.isDeleted) {
        return res.respond(404, "Loan Application not found!");
    }

    return res.respond(200, "Loan Application Details fetched successfully!", loanApplicationDetails)
});

// ##########----------Get Co-Applicants By Loan----------##########
const getCoApplicantsByLoan = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanId } = req.params;

    const operationalManager = await prisma.associateSubAdmin.findUnique({
        where: { userId, isDeleted: false },
        include: {
            role: true
        }
    })
    if (!operationalManager || operationalManager.role.roleName != "Operational Manager") {
        return res.respond(404, "Operational Manager not found!")
    }

    const coApplicants = await prisma.coApplicantDetails.findMany({
        where: {
            id: loanId,
            isDeleted: false,
        }
    })

    return res.respond(200, "Loan Co-Applicants fetched successfully!", coApplicants)
});

module.exports = {
    applyLoan,
    approveCustomerDocuments,
    approveCoapplicantDocuments,
    approveGuarantorDocuments,
    approveLoanToCreditManager,
    getAllLoans,
    getLoanDetails,
    getCoApplicantsByLoan
};