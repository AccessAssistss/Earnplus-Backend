const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Apply Loan----------##########
const applyLoan = asyncHandler(async (req, res) => {
    const customerId = req.user
    const { masterProductId } = req.params;
    const { values } = req.body;

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
            data: { customerId, masterProductId, loanCode },
        });

        await tx.loanFieldValue.createMany({
            data: values.map((v) => ({
                loanApplicationId: createdApplication.id,
                fieldId: v.fieldId,
                dropdownId: v.dropdownId || null,
                subFieldId: v.subFieldId || null,
                value: v.value || null,
            })),
        });

        return application;
    });

    res.respond(201, "Loan Application Submitted Successfully!", {
        loanApplicationId: application.id,
        customerId,
        masterProductId,
    });
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

    res.respond(200, "Customer Loan Applications fetched successfully!", loans);
});

module.exports = {
    applyLoan,
    getLoansByCustomer,
    getLoansByAssociateSubadmin
};
