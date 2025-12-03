const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { validateVariantAgainstMaster } = require("../../../helper/variantValidation");

const prisma = new PrismaClient();

// ##########----------Submit Variant Product Update Request----------##########
const submitVariantProductUpdateRequest = asyncHandler(async (req, res) => {
    const userId = req.user;
    const {
        variantProductId,
        reason,
        variantName,
        productType,
        partnerId,
        remark,
        parameterUpdate,
        otherChargesUpdate,
        repaymentUpdate,
    } = req.body;

    if (!variantProductId || !reason) {
        return res.respond(400, "Variant Product ID and reason are required!");
    }

    const productManager = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
        include: { role: true },
    });

    if (!productManager || productManager.role.roleName !== "Product_Manager") {
        return res.respond(403, "Only Product Managers can submit update requests.");
    }

    const variantProduct = await prisma.variantProduct.findFirst({
        where: { id: variantProductId, isDeleted: false },
        include: {
            masterProduct: {
                include: {
                    financialTerms: true,
                    eligibilityCriteria: true,
                    masterProductOtherCharges: true,
                }
            }
        }
    });

    if (!variantProduct) {
        return res.respond(404, "Variant Product not found!");
    }

    const existingUpdateRequest = await prisma.variantProductUpdateRequest.findFirst({
        where: {
            variantProductId,
            status: "PENDING",
            isDeleted: false,
        },
    });

    if (existingUpdateRequest) {
        return res.respond(409, "A pending update request already exists for this variant product!");
    }

    const existingDeleteRequest = await prisma.variantProductDeleteRequest.findFirst({
        where: {
            variantProductId,
            status: "PENDING",
            isDeleted: false,
        },
    });

    if (existingDeleteRequest) {
        return res.respond(409, "A pending delete request exists for this variant product!");
    }

    const validation = validateVariantAgainstMaster(
        { parameterUpdate, otherChargesUpdate },
        variantProduct.masterProduct
    );

    if (!validation.isValid) {
        return res.respond(400, "Validation failed against Master Product constraints!", {
            errors: validation.errors
        });
    }

    if (partnerId) {
        const partnerExists = await prisma.productPartner.findUnique({
            where: { id: partnerId },
        });
        if (!partnerExists) {
            return res.respond(404, "Product Partner not found!");
        }
    }

    const updateRequest = await prisma.$transaction(async (tx) => {
        const request = await tx.variantProductUpdateRequest.create({
            data: {
                variantProductId,
                requestedById: productManager.id,
                reason,
                variantName,
                productType,
                partnerId,
                remark,
            },
        });

        if (parameterUpdate) {
            await tx.variantProductParameterUpdateRequest.create({
                data: {
                    updateRequestId: request.id,
                    ...parameterUpdate,
                },
            });
        }

        if (otherChargesUpdate) {
            await tx.variantProductOtherChargesUpdateRequest.create({
                data: {
                    updateRequestId: request.id,
                    ...otherChargesUpdate,
                },
            });
        }

        if (repaymentUpdate) {
            await tx.variantProductRepaymentUpdateRequest.create({
                data: {
                    updateRequestId: request.id,
                    ...repaymentUpdate,
                },
            });
        }

        return request;
    });

    res.respond(201, "Variant Product Update Request submitted successfully!", { requestId: updateRequest.id });
});

// ##########----------Get All Variant Product Update Requests----------##########
const getAllVariantProductUpdateRequests = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { status, page = 1, limit = 10 } = req.query;

    const associate = await prisma.associate.findFirst({
        where: { userId, isDeleted: false },
    });

    if (!associate) {
        return res.respond(403, "Associate not found!");
    }

    const whereClause = {
        isDeleted: false,
        ...(status && { status }),
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, totalCount] = await Promise.all([
        prisma.variantProductUpdateRequest.findMany({
            where: whereClause,
            include: {
                variantProduct: {
                    select: {
                        id: true,
                        variantName: true,
                        variantId: true,
                        variantCode: true,
                    },
                },
                requestedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: parseInt(limit),
        }),
        prisma.variantProductUpdateRequest.count({ where: whereClause }),
    ]);

    res.respond(200, "Variant Product Update Requests fetched successfully!", {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        data: requests,
    });
});

// ##########----------Get Variant Product Update Request Detail----------##########
const getVariantProductUpdateRequestDetail = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { requestId } = req.params;

    const associate = await prisma.associate.findFirst({
        where: { userId, isDeleted: false },
    });

    if (!associate) {
        return res.respond(403, "Associate not found!");
    }

    const request = await prisma.variantProductUpdateRequest.findFirst({
        where: {
            id: requestId,
            isDeleted: false,
        },
        include: {
            variantProduct: {
                include: {
                    VariantProductParameter: true,
                    VariantProductOtherCharges: true,
                    VariantProductRepayment: true,
                    productPartner: true,
                },
            },
            requestedBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    mobile: true,
                },
            },
            productPartner: true,
            parameterUpdate: true,
            otherChargesUpdate: true,
            repaymentUpdate: true,
        },
    });

    if (!request) {
        return res.respond(404, "Update Request not found!");
    }

    const currentData = {
        basic: {
            variantName: request.variantProduct.variantName,
            productType: request.variantProduct.productType,
            remark: request.variantProduct.remark,
            productPartner: request.variantProduct.productPartner,
        },
        parameters: request.variantProduct.VariantProductParameter,
        otherCharges: request.variantProduct.VariantProductOtherCharges,
        repayment: request.variantProduct.VariantProductRepayment,
    };

    const proposedData = {
        basic: {
            variantName: request.variantName,
            productType: request.productType,
            partnerId: request.partnerId,
            remark: request.remark,
        },
        parameters: request.parameterUpdate,
        otherCharges: request.otherChargesUpdate,
        repayment: request.repaymentUpdate,
    };

    res.respond(200, "Update Request details fetched successfully!", {
        request: {
            id: request.id,
            variantProductId: request.variantProductId,
            status: request.status,
            reason: request.reason,
            rejectionReason: request.rejectionReason,
            requestedBy: request.requestedBy,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
        },
        currentData,
        proposedData,
        variantProduct: {
            id: request.variantProduct.id,
            variantName: request.variantProduct.variantName,
            variantId: request.variantProduct.variantId,
            variantCode: request.variantProduct.variantCode,
        },
    });
});

// ##########----------Approve Variant Product Update Request----------##########
const approveVariantProductUpdateRequest = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { requestId } = req.params;

    const associate = await prisma.associate.findFirst({
        where: { userId, isDeleted: false },
    });

    if (!associate) {
        return res.respond(403, "Only Main Associate can approve requests!");
    }

    const request = await prisma.variantProductUpdateRequest.findFirst({
        where: {
            id: requestId,
            isDeleted: false,
        },
        include: {
            variantProduct: true,
            parameterUpdate: true,
            otherChargesUpdate: true,
            repaymentUpdate: true,
        },
    });

    if (!request) {
        return res.respond(404, "Update Request not found!");
    }

    if (request.status !== "PENDING") {
        return res.respond(400, `Request is already ${request.status}!`);
    }

    await prisma.$transaction(async (tx) => {
        const { variantProduct } = request;

        await tx.variantProductVersion.create({
            data: {
                variantProductId: variantProduct.id,
                versionId: variantProduct.versionId,
                snapshot: JSON.parse(JSON.stringify(variantProduct)),
            },
        });

        const updateData = {};
        if (request.variantName) updateData.variantName = request.variantName;
        if (request.productType) updateData.productType = request.productType;
        if (request.partnerId) updateData.partnerId = request.partnerId;
        if (request.remark) updateData.remark = request.remark;
        updateData.versionId = variantProduct.versionId + 1;

        await tx.variantProduct.update({
            where: { id: variantProduct.id },
            data: updateData,
        });

        if (request.parameterUpdate) {
            const { id, updateRequestId, ...paramData } = request.parameterUpdate;
            await tx.variantProductParameter.update({
                where: { variantProductId: variantProduct.id },
                data: paramData,
            });
        }

        if (request.otherChargesUpdate) {
            const { id, updateRequestId, createdAt, updatedAt, ...chargesData } = request.otherChargesUpdate;
            await tx.variantProductOtherCharges.update({
                where: { variantProductId: variantProduct.id },
                data: chargesData,
            });
        }

        if (request.repaymentUpdate) {
            const { id, updateRequestId, createdAt, updatedAt, ...repaymentData } = request.repaymentUpdate;
            await tx.variantProductRepayment.update({
                where: { variantProductId: variantProduct.id },
                data: repaymentData,
            });
        }

        await tx.variantProductUpdateRequest.update({
            where: { id: requestId },
            data: {
                status: "APPROVED",
                isDeleted: true,
            },
        });
    });

    res.respond(200, "Variant Product Update Request approved successfully!");
});

// ##########----------Reject Variant Product Update Request----------##########
const rejectVariantProductUpdateRequest = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { requestId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
        return res.respond(400, "Rejection reason is required!");
    }

    const associate = await prisma.associate.findFirst({
        where: { userId, isDeleted: false },
    });

    if (!associate) {
        return res.respond(403, "Only Main Associate can reject requests!");
    }

    const request = await prisma.variantProductUpdateRequest.findFirst({
        where: {
            id: requestId,
            isDeleted: false,
        },
    });

    if (!request) {
        return res.respond(404, "Update Request not found!");
    }

    if (request.status !== "PENDING") {
        return res.respond(400, `Request is already ${request.status}!`);
    }

    await prisma.variantProductUpdateRequest.update({
        where: { id: requestId },
        data: {
            status: "REJECTED",
            rejectionReason,
            isDeleted: true,
        },
    });

    res.respond(200, "Variant Product Update Request rejected!");
});

module.exports = {
    submitVariantProductUpdateRequest,
    getAllVariantProductUpdateRequests,
    getVariantProductUpdateRequestDetail,
    approveVariantProductUpdateRequest,
    rejectVariantProductUpdateRequest,
};