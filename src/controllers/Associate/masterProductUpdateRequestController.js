const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Submit Master Product Update Request----------##########
const submitMasterProductUpdateRequest = asyncHandler(async (req, res) => {
    const userId = req.user;
    const {
        masterProductId,
        reason,
        productName,
        productDescription,
        productCategoryId,
        loanTypeId,
        deliveryChannelIds,
        partnerId,
        purposeIds,
        segmentIds,
        disbursementModeIds,
        repaymentModeIds,
        financialTermsUpdate,
        eligibilityCriteriaUpdate,
        creditBureauConfigUpdate,
        otherChargesUpdate,
        fieldsJsonDataUpdate,
        creditAssignmentRulesUpdate,
    } = req.body;

    if (!masterProductId || !reason) {
        return res.respond(400, "Master Product ID and reason are required!");
    }

    const productManager = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
        include: { role: true },
    });
    if (!productManager || productManager.role.roleName !== "Product_Manager") {
        return res.respond(403, "Only Product Managers can submit update requests.");
    }

    const masterProduct = await prisma.masterProduct.findFirst({
        where: { id: masterProductId, isDeleted: false },
    });
    if (!masterProduct) {
        return res.respond(404, "Master Product not found!");
    }

    const existingUpdateRequest = await prisma.masterProductUpdateRequest.findFirst({
        where: {
            masterProductId,
            status: "PENDING",
            isDeleted: false,
        },
    });

    if (existingUpdateRequest) {
        return res.respond(409, "A pending update request already exists for this product!");
    }

    const existingDeleteRequest = await prisma.masterProductDeleteRequest.findFirst({
        where: {
            masterProductId,
            status: "PENDING",
            isDeleted: false,
        },
    });

    if (existingDeleteRequest) {
        return res.respond(409, "A pending delete request exists for this product. Cannot submit update request!");
    }

    if (productCategoryId) {
        const categoryExists = await prisma.productCategory.findUnique({
            where: { id: productCategoryId },
        });
        if (!categoryExists) {
            return res.respond(404, "Product Category not found!");
        }
    }

    if (loanTypeId) {
        const loanTypeExists = await prisma.loanType.findUnique({
            where: { id: loanTypeId },
        });
        if (!loanTypeExists) {
            return res.respond(404, "Loan Type not found!");
        }
    }

    if (deliveryChannelIds && deliveryChannelIds.length > 0) {
        for (const channelId of deliveryChannelIds) {
            const channelExists = await prisma.deliveryChannel.findUnique({
                where: { id: channelId },
            });
            if (!channelExists) {
                return res.respond(404, `Delivery Channel with ID ${channelId} not found!`);
            }
        }
    }

    if (partnerId) {
        const partnerExists = await prisma.productPartner.findUnique({
            where: { id: partnerId },
        });
        if (!partnerExists) {
            return res.respond(404, "Product Partner not found!");
        }
    }

    if (creditAssignmentRulesUpdate && Array.isArray(creditAssignmentRulesUpdate)) {
        for (const rule of creditAssignmentRulesUpdate) {
            if (!rule.creditRole || rule.minScore == null || rule.maxScore == null) {
                return res.respond(400, "Each credit assignment rule must have creditRole, minScore, and maxScore.");
            }
            if (rule.minScore > rule.maxScore) {
                return res.respond(400, `Invalid score range for ${rule.creditRole}: minScore cannot be greater than maxScore.`);
            }
        }

        for (let i = 0; i < creditAssignmentRulesUpdate.length; i++) {
            for (let j = i + 1; j < creditAssignmentRulesUpdate.length; j++) {
                if (creditAssignmentRulesUpdate[i].creditRole === creditAssignmentRulesUpdate[j].creditRole) {
                    const overlap =
                        (creditAssignmentRulesUpdate[i].minScore <= creditAssignmentRulesUpdate[j].maxScore &&
                            creditAssignmentRulesUpdate[i].maxScore >= creditAssignmentRulesUpdate[j].minScore);

                    if (overlap) {
                        return res.respond(409, `Score ranges overlap for ${creditAssignmentRulesUpdate[i].creditRole} in submitted rules.`);
                    }
                }
            }
        }
    }

    const updateRequest = await prisma.$transaction(async (tx) => {
        const request = await tx.masterProductUpdateRequest.create({
            data: {
                masterProductId,
                requestedById: productManager.id,
                reason,
                productName,
                productDescription,
                productCategoryId,
                loanTypeId,
                deliveryChannelIds: deliveryChannelIds || [],
                partnerId,
                purposeIds: purposeIds || [],
                segmentIds: segmentIds || [],
                disbursementModeIds: disbursementModeIds || [],
                repaymentModeIds: repaymentModeIds || [],
            },
        });

        if (deliveryChannelIds && deliveryChannelIds.length > 0) {
            await tx.masterProductUpdateRequestDeliveryChannel.createMany({
                data: deliveryChannelIds.map((channelId) => ({
                    updateRequestId: request.id,
                    deliveryChannelId: channelId,
                })),
            });
        }

        if (financialTermsUpdate) {
            await tx.financialTermsUpdateRequest.create({
                data: {
                    updateRequestId: request.id,
                    ...financialTermsUpdate,
                },
            });
        }

        if (eligibilityCriteriaUpdate) {
            await tx.eligibilityCriteriaUpdateRequest.create({
                data: {
                    updateRequestId: request.id,
                    ...eligibilityCriteriaUpdate,
                },
            });
        }

        if (creditBureauConfigUpdate) {
            await tx.creditBureauConfigUpdateRequest.create({
                data: {
                    updateRequestId: request.id,
                    ...creditBureauConfigUpdate,
                },
            });
        }

        if (otherChargesUpdate) {
            await tx.masterProductOtherChargesUpdateRequest.create({
                data: {
                    updateRequestId: request.id,
                    ...otherChargesUpdate,
                },
            });
        }

        if (fieldsJsonDataUpdate) {
            await tx.masterProductFieldsUpdateRequest.create({
                data: {
                    updateRequestId: request.id,
                    fieldsJsonData: fieldsJsonDataUpdate,
                },
            });
        }

        if (creditAssignmentRulesUpdate && creditAssignmentRulesUpdate.length > 0) {
            await tx.productCreditAssignmentRuleUpdateRequest.createMany({
                data: creditAssignmentRulesUpdate.map(rule => ({
                    updateRequestId: request.id,
                    creditRole: rule.creditRole,
                    minScore: rule.minScore,
                    maxScore: rule.maxScore,
                })),
            });
        }

        return request;
    });

    res.respond(201, "Master Product Update Request submitted successfully!", { requestId: updateRequest.id });
});

// ##########----------Get All Master Product Update Requests----------##########
const getAllMasterProductUpdateRequests = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { status } = req.query;

    const pageNumber = parseInt(req.query.page) || 1;
    const limitNumber = parseInt(req.query.limit) || 10;

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

    const skip = (pageNumber - 1) * limitNumber;

    const [requests, totalCount] = await Promise.all([
        prisma.masterProductUpdateRequest.findMany({
            where: whereClause,
            include: {
                masterProduct: {
                    select: {
                        id: true,
                        productName: true,
                        productId: true,
                        productCode: true,
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
            take: limitNumber,
        }),
        prisma.masterProductUpdateRequest.count({ where: whereClause }),
    ]);

    res.respond(200, "Master Product Update Requests fetched successfully!", {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / parseInt(limitNumber)),
        data: requests,
    });
});

// ##########----------Get Master Product Update Request Detail----------##########
const getMasterProductUpdateRequestDetail = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { requestId } = req.params;

    const associate = await prisma.associate.findFirst({
        where: { userId, isDeleted: false },
    });

    if (!associate) {
        return res.respond(403, "Associate not found!");
    }

    const request = await prisma.masterProductUpdateRequest.findFirst({
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
                    MasterProductPurpose: {
                        include: {
                            productPurpose: true,
                        },
                    },
                    MasterProductSegment: {
                        include: {
                            productSegment: true,
                        },
                    },
                    MasterProductDeliveryChannel: {
                        include: {
                            deliveryChannel: true,
                        },
                    },
                    FinancialDisbursementMode: {
                        include: {
                            disbursementMode: true,
                        },
                    },
                    FinancialRepaymentMode: {
                        include: {
                            RepaymentModes: true,
                        },
                    },
                    financialTerms: true,
                    eligibilityCriteria: true,
                    creditBureauConfig: true,
                    masterProductOtherCharges: true,
                    MasterProductFields: true,
                    ProductCreditAssignmentRule: {
                        where: { isDeleted: false },
                        orderBy: [
                            { creditRole: 'asc' },
                            { minScore: 'asc' },
                        ],
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
            productCategory: true,
            loanType: true,
            productPartner: true,
            MasterProductUpdateRequestDeliveryChannel: {
                include: {
                    deliveryChannel: true,
                },
            },
            financialTermsUpdate: true,
            eligibilityCriteriaUpdate: true,
            creditBureauConfigUpdate: true,
            masterProductOtherChargesUpdate: true,
            masterProductFieldsUpdate: true,
            productCreditAssignmentRuleUpdate: {
                orderBy: [
                    { creditRole: 'asc' },
                    { minScore: 'asc' },
                ],
            },
        },
    });

    if (!request) {
        return res.respond(404, "Update Request not found!");
    }

    const currentData = {
        basic: {
            productName: request.masterProduct.productName,
            productDescription: request.masterProduct.productDescription,
            productCategory: request.masterProduct.productCategory,
            loanType: request.masterProduct.loanType,
            deliveryChannels: request.masterProduct.MasterProductDeliveryChannel.map(dc => dc.deliveryChannel),
            productPartner: request.masterProduct.productPartner,
            purposes: request.masterProduct.MasterProductPurpose.map(p => p.productPurpose),
            segments: request.masterProduct.MasterProductSegment.map(s => s.productSegment),
            disbursementModes: request.masterProduct.FinancialDisbursementMode.map(d => d.disbursementMode),
            repaymentModes: request.masterProduct.FinancialRepaymentMode.map(r => r.RepaymentModes),
        },
        financialTerms: request.masterProduct.financialTerms,
        eligibilityCriteria: request.masterProduct.eligibilityCriteria,
        creditBureauConfig: request.masterProduct.creditBureauConfig,
        otherCharges: request.masterProduct.masterProductOtherCharges,
        productFields: request.masterProduct.MasterProductFields,
        creditAssignmentRules: request.masterProduct.ProductCreditAssignmentRule,
    };

    const proposedData = {
        basic: {
            productName: request.productName,
            productDescription: request.productDescription,
            productCategoryId: request.productCategoryId,
            loanTypeId: request.loanTypeId,
            deliveryChannels: request.MasterProductUpdateRequestDeliveryChannel.map(dc => dc.deliveryChannel),
            partnerId: request.partnerId,
            purposeIds: request.purposeIds,
            segmentIds: request.segmentIds,
            disbursementModeIds: request.disbursementModeIds,
            repaymentModeIds: request.repaymentModeIds,
        },
        financialTerms: request.financialTermsUpdate,
        eligibilityCriteria: request.eligibilityCriteriaUpdate,
        creditBureauConfig: request.creditBureauConfigUpdate,
        otherCharges: request.masterProductOtherChargesUpdate,
        productFields: request.masterProductFieldsUpdate,
        creditAssignmentRules: request.productCreditAssignmentRuleUpdate,
    };

    res.respond(200, "Update Request details fetched successfully!", {
        request: {
            id: request.id,
            masterProductId: request.masterProductId,
            status: request.status,
            reason: request.reason,
            rejectionReason: request.rejectionReason,
            requestedBy: request.requestedBy,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
        },
        currentData,
        proposedData,
        masterProduct: {
            id: request.masterProduct.id,
            productName: request.masterProduct.productName,
            productId: request.masterProduct.productId,
            productCode: request.masterProduct.productCode,
        },
    });
});

// ##########----------Approve Master Product Update Request----------##########
const approveMasterProductUpdateRequest = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { requestId } = req.params;

    const associate = await prisma.associate.findFirst({
        where: { userId, isDeleted: false },
    });

    if (!associate) {
        return res.respond(403, "Only Main Associate can approve requests!");
    }

    const request = await prisma.masterProductUpdateRequest.findFirst({
        where: {
            id: requestId,
            isDeleted: false,
        },
        include: {
            masterProduct: true,
            financialTermsUpdate: true,
            eligibilityCriteriaUpdate: true,
            creditBureauConfigUpdate: true,
            masterProductOtherChargesUpdate: true,
            masterProductFieldsUpdate: true,
            productCreditAssignmentRuleUpdate: true,
        },
    });

    if (!request) {
        return res.respond(404, "Update Request not found!");
    }

    if (request.status !== "PENDING") {
        return res.respond(400, `Request is already ${request.status}!`);
    }

    await prisma.$transaction(async (tx) => {
        const { masterProduct } = request;

        await tx.masterProductVersion.create({
            data: {
                masterProductId: masterProduct.id,
                versionId: masterProduct.versionId,
                snapshot: JSON.parse(JSON.stringify(masterProduct)),
            },
        });

        const updateData = {};
        if (request.productName) updateData.productName = request.productName;
        if (request.productDescription) updateData.productDescription = request.productDescription;
        if (request.productCategoryId) updateData.productCategoryId = request.productCategoryId;
        if (request.loanTypeId) updateData.loanTypeId = request.loanTypeId;
        if (request.partnerId) updateData.partnerId = request.partnerId;
        updateData.versionId = masterProduct.versionId + 1;

        await tx.masterProduct.update({
            where: { id: masterProduct.id },
            data: updateData,
        });

        if (request.purposeIds && request.purposeIds.length > 0) {
            await tx.masterProductPurpose.deleteMany({
                where: { masterProductId: masterProduct.id },
            });
            await tx.masterProductPurpose.createMany({
                data: request.purposeIds.map(purposeId => ({
                    masterProductId: masterProduct.id,
                    purposeId,
                })),
            });
        }

        if (request.segmentIds && request.segmentIds.length > 0) {
            await tx.masterProductSegment.deleteMany({
                where: { masterProductId: masterProduct.id },
            });
            await tx.masterProductSegment.createMany({
                data: request.segmentIds.map(segmentId => ({
                    masterProductId: masterProduct.id,
                    segmentId,
                })),
            });
        }

        if (request.deliveryChannelIds && request.deliveryChannelIds.length > 0) {
            await tx.masterProductDeliveryChannel.deleteMany({
                where: { masterProductId: masterProduct.id },
            });
            await tx.masterProductDeliveryChannel.createMany({
                data: request.deliveryChannelIds.map(channelId => ({
                    masterProductId: masterProduct.id,
                    deliveryChannelId: channelId,
                })),
            });
        }

        if (request.disbursementModeIds && request.disbursementModeIds.length > 0) {
            await tx.financialDisbursementMode.deleteMany({
                where: { masterProductId: masterProduct.id },
            });
            await tx.financialDisbursementMode.createMany({
                data: request.disbursementModeIds.map(disbursementId => ({
                    masterProductId: masterProduct.id,
                    disbursementId,
                })),
            });
        }

        if (request.repaymentModeIds && request.repaymentModeIds.length > 0) {
            await tx.financialRepaymentMode.deleteMany({
                where: { masterProductId: masterProduct.id },
            });
            await tx.financialRepaymentMode.createMany({
                data: request.repaymentModeIds.map(repaymentId => ({
                    masterProductId: masterProduct.id,
                    repaymentId,
                })),
            });
        }

        if (request.financialTermsUpdate) {
            const { id, updateRequestId, ...financialData } = request.financialTermsUpdate;
            await tx.financialTerms.update({
                where: { masterProductId: masterProduct.id },
                data: financialData,
            });
        }

        if (request.eligibilityCriteriaUpdate) {
            const { id, updateRequestId, ...eligibilityData } = request.eligibilityCriteriaUpdate;
            await tx.eligibilityCriteria.update({
                where: { masterProductId: masterProduct.id },
                data: eligibilityData,
            });
        }

        if (request.creditBureauConfigUpdate) {
            const { id, updateRequestId, ...bureauData } = request.creditBureauConfigUpdate;
            await tx.creditBureauConfig.update({
                where: { masterProductId: masterProduct.id },
                data: bureauData,
            });
        }

        if (request.masterProductOtherChargesUpdate) {
            const { id, updateRequestId, createdAt, updatedAt, ...chargesData } = request.masterProductOtherChargesUpdate;
            await tx.masterProductOtherCharges.update({
                where: { masterProductId: masterProduct.id },
                data: chargesData,
            });
        }
        if (request.masterProductFieldsUpdate) {
            const { id, updateRequestId, createdAt, updatedAt, isDeleted, ...fieldsData } = request.masterProductFieldsUpdate;

            const existingFields = await tx.masterProductFields.findUnique({
                where: { masterProductId: masterProduct.id },
            });

            if (existingFields) {
                await tx.masterProductFields.update({
                    where: { masterProductId: masterProduct.id },
                    data: fieldsData,
                });
            } else {
                await tx.masterProductFields.create({
                    data: {
                        masterProductId: masterProduct.id,
                        ...fieldsData,
                    },
                });
            }
        }

        if (request.productCreditAssignmentRuleUpdate && request.productCreditAssignmentRuleUpdate.length > 0) {
            await tx.productCreditAssignmentRule.updateMany({
                where: { masterProductId: masterProduct.id },
                data: { isDeleted: true },
            });

            for (const ruleUpdate of request.productCreditAssignmentRuleUpdate) {
                const { id, updateRequestId, createdAt, updatedAt, isDeleted, ...ruleData } = ruleUpdate;
                
                await tx.productCreditAssignmentRule.create({
                    data: {
                        masterProductId: masterProduct.id,
                        ...ruleData,
                    },
                });
            }
        }

        await tx.masterProductUpdateRequest.update({
            where: { id: requestId },
            data: {
                status: "APPROVED",
                isDeleted: true,
            },
        });
    });

    res.respond(200, "Master Product Update Request approved successfully!");
});

// ##########----------Reject Master Product Update Request----------##########
const rejectMasterProductUpdateRequest = asyncHandler(async (req, res) => {
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

    const request = await prisma.masterProductUpdateRequest.findFirst({
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

    await prisma.masterProductUpdateRequest.update({
        where: { id: requestId },
        data: {
            status: "REJECTED",
            rejectionReason,
            isDeleted: true,
        },
    });

    res.respond(200, "Master Product Update Request rejected!");
});

module.exports = {
    submitMasterProductUpdateRequest,
    getAllMasterProductUpdateRequests,
    getMasterProductUpdateRequestDetail,
    approveMasterProductUpdateRequest,
    rejectMasterProductUpdateRequest,
};