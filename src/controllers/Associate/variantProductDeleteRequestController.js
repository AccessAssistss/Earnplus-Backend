const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { validateVariantAgainstMaster } = require("../../../helper/variantValidation");

const prisma = new PrismaClient();

// ##########----------Submit Variant Product Delete Request----------##########
const submitVariantProductDeleteRequest = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { variantProductId, reason } = req.body;

    if (!variantProductId || !reason) {
        return res.respond(400, "Variant Product ID and reason are required!");
    }

    const productManager = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
        include: { role: true },
    });

    if (!productManager || productManager.role.roleName !== "Product_Manager") {
        return res.respond(403, "Only Product Managers can submit delete requests.");
    }

    const variantProduct = await prisma.variantProduct.findFirst({
        where: { id: variantProductId, isDeleted: false },
    });

    if (!variantProduct) {
        return res.respond(404, "Variant Product not found!");
    }

    const existingDeleteRequest = await prisma.variantProductDeleteRequest.findFirst({
        where: {
            variantProductId,
            status: "PENDING",
            isDeleted: false,
        },
    });

    if (existingDeleteRequest) {
        return res.respond(409, "A pending delete request already exists for this variant product!");
    }

    const existingUpdateRequest = await prisma.variantProductUpdateRequest.findFirst({
        where: {
            variantProductId,
            status: "PENDING",
            isDeleted: false,
        },
    });

    if (existingUpdateRequest) {
        return res.respond(409, "A pending update request exists for this variant product. Cannot submit delete request!");
    }

    const deleteRequest = await prisma.variantProductDeleteRequest.create({
        data: {
            variantProductId,
            requestedById: productManager.id,
            reason,
        },
    });

    res.respond(201, "Variant Product Delete Request submitted successfully!", { requestId: deleteRequest.id });
});

// ##########----------Get All Variant Product Delete Requests----------##########
const getAllVariantProductDeleteRequests = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { status, page = 1, limit = 10 } = req.query;

    const associate = await prisma.associate.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!associate) {
        return res.respond(403, "Associate not found!");
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const safePage = Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
    const safeLimit = Number.isInteger(limitNumber) && limitNumber > 0 ? limitNumber : 10;

    const skip = (safePage - 1) * safeLimit;

    const whereClause = {
        isDeleted: false,
        ...(status && { status }),
    };

    const [requests, totalCount] = await Promise.all([
        prisma.variantProductDeleteRequest.findMany({
            where: whereClause,
            include: {
                variantProduct: {
                    select: {
                        id: true,
                        variantName: true,
                        variantId: true,
                        variantCode: true,
                        productType: true,
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
            take: safeLimit,
        }),
        prisma.variantProductDeleteRequest.count({ where: whereClause }),
    ]);

    res.respond(200, "Variant Product Delete Requests fetched successfully!", {
        total: totalCount,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(totalCount / safeLimit),
        data: requests,
    });
});

// ##########----------Get Variant Product Delete Request Detail----------##########
const getVariantProductDeleteRequestDetail = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { requestId } = req.params;

    const associate = await prisma.associate.findFirst({
        where: { userId, isDeleted: false },
    });

    if (!associate) {
        return res.respond(403, "Associate not found!");
    }

    const request = await prisma.variantProductDeleteRequest.findFirst({
        where: {
            id: requestId,
            isDeleted: false,
        },
        include: {
            variantProduct: {
                include: {
                    masterProduct: {
                        select: {
                            id: true,
                            productName: true,
                            productCode: true,
                        },
                    },
                    VariantProductParameter: true,
                    VariantProductOtherCharges: true,
                    VariantProductRepayment: true,
                    AssignVariantProductToEmployer: {
                        where: { isDeleted: false },
                        select: {
                            id: true,
                            employer: {
                                select: {
                                    id: true,
                                    name: true,
                                    employerId: true,
                                },
                            },
                        },
                    },
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
        },
    });

    if (!request) {
        return res.respond(404, "Delete Request not found!");
    }

    res.respond(200, "Delete Request details fetched successfully!", request);
});

// ##########----------Handle Variant Product Delete Request (Approve/Reject)----------##########
const handleVariantProductDeleteRequest = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { requestId } = req.params;
    const { action, rejectionReason } = req.body;

    if (!["APPROVE", "REJECT"].includes(action)) {
        return res.respond(400, "Action must be APPROVE or REJECT!");
    }

    if (action === "REJECT" && !rejectionReason) {
        return res.respond(400, "Rejection reason is required!");
    }

    const associate = await prisma.associate.findFirst({
        where: { userId, isDeleted: false },
    });

    if (!associate) {
        return res.respond(403, "Only Main Associate can handle delete requests!");
    }

    const request = await prisma.variantProductDeleteRequest.findFirst({
        where: {
            id: requestId,
            isDeleted: false,
        },
        include: {
            variantProduct: true,
        },
    });

    if (!request) {
        return res.respond(404, "Delete Request not found!");
    }

    if (request.status !== "PENDING") {
        return res.respond(400, `Request is already ${request.status}!`);
    }

    if (action === "APPROVE") {
        await prisma.$transaction(async (tx) => {
            await tx.variantProduct.update({
                where: { id: request.variantProductId },
                data: { isDeleted: true },
            });

            await tx.assignVariantProductToEmployer.updateMany({
                where: { variantProductId: request.variantProductId },
                data: { isDeleted: true },
            });

            await tx.variantProductUpdateRequest.updateMany({
                where: {
                    variantProductId: request.variantProductId,
                    status: "PENDING",
                },
                data: { isDeleted: true, status: "REJECTED" },
            });

            await tx.variantProductDeleteRequest.update({
                where: { id: requestId },
                data: {
                    status: "APPROVED",
                    isDeleted: true,
                },
            });
        });

        res.respond(200, "Variant Product deleted successfully!");
    } else {
        await prisma.variantProductDeleteRequest.update({
            where: { id: requestId },
            data: {
                status: "REJECTED",
                rejectionReason,
                isDeleted: true,
            },
        });

        res.respond(200, "Delete Request rejected!");
    }
});

module.exports = {
    submitVariantProductDeleteRequest,
    getAllVariantProductDeleteRequests,
    getVariantProductDeleteRequestDetail,
    handleVariantProductDeleteRequest,
};