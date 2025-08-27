const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

const applyLoan = asyncHandler(async (req, res) => {
    const customerId = req.user
    const { productId, fields, documents } = req.body;

    if (!productId) {
        return res.respond(400, "ProductId is required!");
    }

    const customer = await prisma.employee.findFirst({
        where: { id: customerId, isDeleted: false },
    });
    if (!customer) {
        return res.respond(404, "Customer not found.");
    }

    const loanApplication = await prisma.loanApplication.create({
        data: {
            customerId,
            productId,
            fieldValues: {
                create: fields.map(f => ({
                    fieldId: f.fieldId,
                    value: f.value || null,
                    dropdownId: f.dropdownId || null,
                    subFieldId: f.subFieldId || null
                }))
            },
            documents: {
                create: documents?.map(doc => ({
                    type: doc.type,
                    url: doc.url
                })) || []
            }
        },
        include: {
            fieldValues: true,
            documents: true
        }
    });

    res.respond(201, "Loan Application Submitted Successfully!", loanApplication);
});

module.exports = { applyLoan };
