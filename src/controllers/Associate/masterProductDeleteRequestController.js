const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Submit Master Product Delete Request----------##########
const submitMasterProductDeleteRequest = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { masterProductId, reason } = req.body;

    if (!masterProductId || !reason) {
        return res.respond(400, "Master Product ID and reason are required!");
    }

    const productManager = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
        include: { role: true },
    });

    if (!productManager || productManager.role.roleName !== "Product_Manager") {
        return res.respond(403, "Only Product Managers can submit delete requests.");
    }

    const masterProduct = await prisma.masterProduct.findFirst({
        where: { id: masterProductId, isDeleted: false },
    });

    if (!masterProduct) {
        return res.respond(404, "Master Product not found!");
    }

    const existingDeleteRequest = await prisma.masterProductDeleteRequest.findFirst({
        where: {
            masterProductId,
            status: "PENDING",
            isDeleted: false,
        },
    });

    if (existingDeleteRequest) {
        return res.respond(409, "A pending delete request already exists for this product!");
    }


    const existingUpdateRequest = await prisma.masterProductUpdateRequest.findFirst({
        where: {
            masterProductId,
            status: "PENDING",
            isDeleted: false,
        },
    });

    if (existingUpdateRequest) {
        return res.respond(409, "A pending update request exists for this product. Cannot submit delete request!");
    }
    const deleteRequest = await prisma.masterProductDeleteRequest.create({
        data: {
            masterProductId,
            requestedById: productManager.id,
            reason,
        },
    });
    res.respond(201, "Master Product Delete Request submitted successfully!", { requestId: deleteRequest.id });
});
// ##########----------Get All Master Product Delete Requests----------##########
const getAllMasterProductDeleteRequests = asyncHandler(async (req, res) => {
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
        prisma.masterProductDeleteRequest.findMany({
            where: whereClause,
            include: {
                masterProduct: {
                    select: {
                        id: true,
                        productName: true,
                        productId: true,
                        productCode: true,
                        status: true,
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
        prisma.masterProductDeleteRequest.count({ where: whereClause }),
    ]);

    res.respond(200, "Master Product Delete Requests fetched successfully!", {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        data: requests,
    });
});
// ##########----------Get Master Product Delete Request Detail----------##########
const getMasterProductDeleteRequestDetail = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { requestId } = req.params;

    const associate = await prisma.associate.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!associate) {
        return res.respond(403, "Associate not found!");
    }

    const request = await prisma.masterProductDeleteRequest.findFirst({
        where: {
            id: requestId,
            isDeleted: false,
        },
        include: {
            masterProduct: {
                include: {
                    productCategory: true,
                    loanType: true,
                    productPartner: true,
                    VariantProduct: {
                        where: { isDeleted: false },
                        select: {
                            id: true,
                            variantName: true,
                            variantCode: true,
                        },
                    },
                    _count: {
                        select: {
                            VariantProduct: { where: { isDeleted: false } },
                            LoanApplication: { where: { isDeleted: false } },
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
// ##########----------Handle Master Product Delete Request (Approve/Reject)----------##########
const handleMasterProductDeleteRequest = asyncHandler(async (req, res) => {
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

    const request = await prisma.masterProductDeleteRequest.findFirst({
        where: {
            id: requestId,
            isDeleted: false,
        },
        include: {
            masterProduct: true,
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
            await tx.masterProduct.update({
                where: { id: request.masterProductId },
                data: { isDeleted: true },
            });
            await tx.variantProduct.updateMany({
                where: { masterProductId: request.masterProductId },
                data: { isDeleted: true },
            });

            await tx.assignVariantProductToEmployer.updateMany({
                where: {
                    variantProduct: {
                        masterProductId: request.masterProductId,
                    },
                },
                data: { isDeleted: true },
            });

            await tx.masterProductUpdateRequest.updateMany({
                where: {
                    masterProductId: request.masterProductId,
                    status: "PENDING",
                },
                data: { isDeleted: true, status: "REJECTED" },
            });

            await tx.masterProductDeleteRequest.update({
                where: { id: requestId },
                data: {
                    status: "APPROVED",
                    isDeleted: true,
                },
            });
        });

        res.respond(200, "Master Product deleted successfully!");
        
    } else {
        await prisma.masterProductDeleteRequest.update({
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
    submitMasterProductDeleteRequest,
    getAllMasterProductDeleteRequests,
    getMasterProductDeleteRequestDetail,
    handleMasterProductDeleteRequest,
};