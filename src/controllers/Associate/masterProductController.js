const { asyncHandler } = require("../../../utils/asyncHandler");
const { PrismaClient } = require("@prisma/client");
const { generateProductCode } = require("../../../utils/uniqueCodeGenerator");

const prisma = new PrismaClient();

// ##########----------Create Master Product----------##########
const createMasterProduct = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    productCategoryId,
    productName,
    productDescription,
    productCode,
    loanTypeId,
    deliveryChannelId,
    partnerId,
    financialTerms,
    eligibilityCriteria,
    creditBureauConfig,
    financialStatements,
    behavioralData,
    riskScoring,
    purposeIds = [],
    segments = []
  } = req.body;

  if (
    !productName ||
    !productCategoryId ||
    !productCode ||
    !loanTypeId ||
    !deliveryChannelId ||
    !partnerId ||
    purposeIds.length === 0
  ) {
    return res.respond(400, "All fields are required, including associations.");
  }

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can create products.");
  }

  const generatedCode = generateProductCode(productName);

  const existingName = await prisma.masterProduct.findFirst({
    where: { productName: { equals: productName, mode: "insensitive" } },
  });
  if (existingName) {
    return res.respond(409, "A product with this name already exists.");
  }

  const existingCode = await prisma.masterProduct.findFirst({
    where: { productId: generatedCode },
  });
  if (existingCode) {
    return res.respond(
      409,
      "Generated product code already exists. Try a different name."
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.masterProduct.create({
      data: {
        productCategoryId,
        productName,
        productId: generatedCode,
        productCode,
        productDescription,
        loanTypeId,
        deliveryChannelId,
        partnerId,
        versionId,

        MasterProductPurpose: {
          create: purposes?.map((purposeId) => ({
            purposeId,
          })),
        },
        MasterProductSegment: {
          create: segments?.map((segmentId) => ({
            segmentId,
          })),
        },

        financialTerms: financialTerms && {
          create: {
            ...financialTerms,
            FinancialDisbursementMode: {
              create: disbursementModes?.map((disbursementId) => ({
                disbursementId,
              })),
            },
            FinancialRepaymentMode: {
              create: repaymentModes?.map((repaymentId) => ({
                repaymentId,
              })),
            },
          },
        },

        eligibilityCriteria: eligibilityCriteria && {
          create: {
            ...eligibilityCriteria,
            minDocumentsRequired: {
              create: eligibilityCriteria.documents?.map((documentId) => ({
                documentId,
              })),
            },
            documentSubmissionModes: {
              set: eligibilityCriteria.documentSubmissionModes || [],
            },
            documentVerificationModes: {
              set: eligibilityCriteria.documentVerificationModes || [],
            },
            employmentTypesAllowed: {
              create: eligibilityCriteria.employmentTypes?.map((employmentId) => ({
                employmentId,
              })),
            },
          },
        },

        creditBureauConfig: creditBureauConfig && {
          create: creditBureauConfig,
        },

        financialStatements: financialStatements && {
          create: financialStatements,
        },

        behavioralData: behavioralData && {
          create: behavioralData,
        },

        riskScoring: riskScoring && {
          create: {
            ...riskScoring,
            internalScoreVars: {
              create: internalScoreVars?.map((scoreId) => ({
                scoreId,
              })),
            },
            externalScoreInputs: {
              create: externalScoreInputs?.map((externalId) => ({
                externalId,
              })),
            },
          },
        },

        Collateral: collateralData && {
          create: {
            ...collateralData,
            collateralDocs: {
              create: collateralData.doc?.map((docId) => ({
                docId,
              })),
            },
            guarantorIncomeProofTypes: {
              set: collateralData.guarantorIncomeProofTypes || [],
            },
          },
        },
      },
    });

    return product;
  });

  return res.respond(201, "Master Product Created Successfully!", result);
});

// ##########----------Master Product Update Request----------##########
const submitMasterProductUpdateRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    masterProductId,
    createdById,
    coreUpdate,
    loanUpdate,
    feeUpdate,
    complianceUpdate,
    disbursementUpdate,
    performanceUpdate,
    purposeIds,
    useCaseIds,
    customerTypeIds,
  } = req.body;

  if (
    !masterProductId ||
    !coreUpdate ||
    !loanUpdate ||
    !feeUpdate ||
    !complianceUpdate ||
    !disbursementUpdate ||
    !performanceUpdate
  ) {
    return res.respond(400, "Required fields are missing!");
  }

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can create products.");
  }

  const masterProduct = await prisma.masterProduct.findUnique({
    where: { id: masterProductId },
  });
  if (!masterProduct) {
    return res.respond(404, "Master Product not found.");
  }

  const updateRequest = await prisma.masterProductUpdateRequest.create({
    data: {
      masterProductId,
      createdById,
      masterProductCoreUpdate: {
        create: coreUpdate,
      },
      masterProductLoanUpdate: {
        create: loanUpdate,
      },
      masterProductFeeUpdate: {
        create: feeUpdate,
      },
      masterProductComplianceUpdate: {
        create: complianceUpdate,
      },
      masterProductDisbursementUpdate: {
        create: disbursementUpdate,
      },
      masterProductPerformanceUpdate: {
        create: performanceUpdate,
      },
      masterProductPurposeUpdates: {
        createMany: {
          data: purposeIds.map((id) => ({ purposeId: id })),
        },
      },
      masterProductUseCaseUpdates: {
        createMany: {
          data: useCaseIds.map((id) => ({ commonUseCaseId: id })),
        },
      },
      masterProductCustomerUpdates: {
        createMany: {
          data: customerTypeIds.map((id) => ({ customerTypeId: id })),
        },
      },
    },
  });

  res.respond(
    201,
    "Master Product Update Request Submitted Successfully!",
    updateRequest
  );
});

// ##########----------Approve Master Product Update Request----------##########
const approveMasterProductUpdateRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { requestId } = req.params;

  const associate = await prisma.associate.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!associate) {
    return res.respond(403, "associate not found!");
  }

  const request = await prisma.masterProductUpdateRequest.findUnique({
    where: { id: requestId },
    include: {
      masterProduct: {
        include: {
          MasterProductLoanStructure: true,
          MasterProductFeeStructure: true,
          MasterProductSecurityCompliance: true,
          MasterProductDisbursementRules: true,
          MasterProductPerformance: true,
          MasterProductPurpose: true,
          MasterProductCommonUseCase: true,
          MasterProductCustomerType: true,
        },
      },
      masterProductCoreUpdate: true,
      masterProductLoanUpdate: true,
      masterProductFeeUpdate: true,
      masterProductComplianceUpdate: true,
      masterProductDisbursementUpdate: true,
      masterProductPerformanceUpdate: true,
      masterProductPurposeUpdates: true,
      masterProductUseCaseUpdates: true,
      masterProductCustomerUpdates: true,
    },
  });

  if (!request) {
    return res.respond(404, "Update request not found.");
  }

  const currentProduct = request.masterProduct;
  const newVersionId = currentProduct.versionId + 1;

  function cleanPrismaUpdateData(
    data,
    disallowedFields = ["id", "updateRequestId", "createdAt", "updatedAt"]
  ) {
    const cleaned = { ...data };
    for (const field of disallowedFields) {
      delete cleaned[field];
    }
    return cleaned;
  }

  await prisma.$transaction(async (tx) => {
    await tx.masterProductVersion.create({
      data: {
        masterProductId: currentProduct.id,
        versionId: currentProduct.versionId,
        snapshot: JSON.parse(JSON.stringify(currentProduct)),
      },
    });

    await tx.masterProduct.update({
      where: { id: currentProduct.id },
      data: {
        productName: request.masterProductCoreUpdate.productName,
        productDescription: request.masterProductCoreUpdate.productDescription,
        productCategoryId: request.masterProductCoreUpdate.productCategoryId,
        versionId: newVersionId,
      },
    });

    await tx.masterProductLoanStructure.update({
      where: { id: currentProduct.MasterProductLoanStructure?.id },
      data: cleanPrismaUpdateData(request.masterProductLoanUpdate),
    });

    await tx.masterProductFeeStructure.update({
      where: { id: currentProduct.MasterProductFeeStructure?.id },
      data: cleanPrismaUpdateData(request.masterProductFeeUpdate),
    });

    await tx.masterProductSecurityCompliance.update({
      where: { id: currentProduct.MasterProductSecurityCompliance?.id },
      data: cleanPrismaUpdateData(request.masterProductComplianceUpdate),
    });

    await tx.masterProductDisbursementRules.update({
      where: { id: currentProduct.MasterProductDisbursementRules?.id },
      data: cleanPrismaUpdateData(request.masterProductDisbursementUpdate),
    });

    await tx.masterProductPerformance.update({
      where: { id: currentProduct.MasterProductPerformance?.id },
      data: cleanPrismaUpdateData(request.masterProductPerformanceUpdate),
    });

    await tx.masterProductPurpose.deleteMany({
      where: { masterProductId: currentProduct.id },
    });
    await tx.masterProductPurpose.createMany({
      data: request.masterProductPurposeUpdates.map((p) => ({
        masterProductId: currentProduct.id,
        purposeId: p.purposeId,
      })),
    });

    await tx.masterProductCommonUseCase.deleteMany({
      where: { masterProductId: currentProduct.id },
    });
    await tx.masterProductCommonUseCase.createMany({
      data: request.masterProductUseCaseUpdates.map((u) => ({
        masterProductId: currentProduct.id,
        commonuseCaseId: u.commonUseCaseId,
      })),
    });

    await tx.masterProductCustomerType.deleteMany({
      where: { masterProductId: currentProduct.id },
    });
    await tx.masterProductCustomerType.createMany({
      data: request.masterProductCustomerUpdates.map((c) => ({
        masterProductId: currentProduct.id,
        customerTypeId: c.customerTypeId,
      })),
    });

    await tx.masterProductUpdateRequest.update({
      where: { id: requestId },
      data: {
        isApproved: true,
        isDeleted: true,
      },
    });
  });

  return res.respond(200, "Update request approved and applied!");
});

// ##########----------Reject Master Product Update Request----------##########
const rejectMasterProductUpdateRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { requestId } = req.params;
  const { reason } = req.body;

  const associate = await prisma.associate.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!associate) {
    return res.respond(403, "associate not found!");
  }

  const request = await prisma.masterProductUpdateRequest.findUnique({
    where: { id: requestId },
  });
  if (!request) {
    return res
      .status(404)
      .json({ success: false, message: "Update request not found" });
  }

  await prisma.masterProductUpdateRequest.update({
    where: { id: requestId },
    data: {
      isRejected: true,
      isDeleted: true,
      rejectionReason: reason,
    },
  });

  return res.respond(
    200,
    "Master Product Update request rejected successfully."
  );
});

// ##########----------Get All Master Products----------##########
const getAllMasterProducts = asyncHandler(async (req, res) => {
  const userId = req.user;

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can get products.");
  }

  const masterProducts = await prisma.masterProduct.findMany({
    where: {
      productManagerId: productManager.id,
      isDeleted: false,
    },
    select: {
      id: true,
      productName: true,
      productCode: true,
      productDescription: true,
      productType: true,
      versionId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.respond(200, "Master Products fetched successfully!", masterProducts);
});

// ##########----------Get Master Product Details----------##########
const getMasterProductDetails = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { productId } = req.params;

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can create products.");
  }

  const masterProduct = await prisma.masterProduct.findMany({
    where: {
      id: productId,
      isDeleted: false,
      productManagerId: productManager.id,
    },
    select: {
      id: true,
      productName: true,
      productCode: true,
      productDescription: true,
      productType: true,
      versionId: true,
      createdAt: true,
      updatedAt: true,
      productCategory: {
        select: {
          id: true,
          categoryName: true,
        },
      },
      MasterProductPurpose: {
        select: {
          id: true,
          productPurpose: {
            select: {
              id: true,
              purpose: true,
            },
          },
        },
      },
      MasterProductCommonUseCase: {
        select: {
          id: true,
          commonuseCase: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      MasterProductCustomerType: {
        select: {
          id: true,
          customerType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      MasterProductLoanStructure: {
        select: {
          id: true,
          minLoanAmount: true,
          maxLoanAmount: true,
          tenureType: true,
          tenureUnit: true,
          minTenure: true,
          maxTenure: true,
          allowedTenureValues: true,
          defaultTenure: true,
          isTenureBasedOnPaymentCycle: true,
          tenureCalcLogic: true,
          allowRepaymentOverride: true,
          interestType: true,
          interestRate: true,
          gracePeriod: true,
          penalInterestRate: true,
          moratoriumPeriod: true,
          repaymentMethod: true,
          latePaymentFee: true,
          prePaymentAllowed: true,
          paymentCharges: true,
          lockinPeriod: true,
        },
      },
      MasterProductFeeStructure: {
        select: {
          id: true,
          processingFee: true,
          setupFee: true,
          subscriptionOption: true,
          perTransactionFee: true,
          insuranceCharge: true,
          otherCharges: true,
        },
      },
      MasterProductSecurityCompliance: {
        select: {
          id: true,
          collateralRequired: true,
          collateralType: true,
          kycRequired: true,
          coBorrowerRequired: true,
          insuranceBundeled: true,
          creditBureauMandatory: true,
          minCibil: true,
          concentFormat: true,
          defaultReporting: true,
          riskCategory: true,
        },
      },
      MasterProductDisbursementRules: {
        select: {
          id: true,
          disbursementMode: true,
          varientAllowed: true,
          apiEnabledProduct: true,
        },
      },
      MasterProductPerformance: {
        select: {
          id: true,
          monitoringType: true,
          delinquencyTriggerThreshold: true,
          portfolioCap: true,
          reviewCycle: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!masterProduct) {
    return res.respond(404, "Product not found or access denied.");
  }

  res.respond(200, "Master Products fetched successfully!", masterProduct);
});

// ##########----------Master Product Versions----------##########
const getMasterProductVersions = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { masterProductId } = req.params;

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can access this data.");
  }

  const masterProduct = await prisma.masterProduct.findFirst({
    where: { id: masterProductId, isDeleted: false },
  });

  if (!masterProduct) {
    return res.respond(404, "Master product not found.");
  }

  const versions = await prisma.masterProductVersion.findMany({
    where: { masterProductId },
    orderBy: { versionId: "desc" },
  });

  return res.respond(
    200,
    "Master product version history fetched successfully!",
    versions
  );
});

// ##########----------Master Product Version Detail----------##########
const getMasterProductVersionById = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { versionId } = req.params;

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can access this data.");
  }

  const version = await prisma.masterProductVersion.findUnique({
    where: { id: versionId },
    include: {
      masterProduct: {
        select: {
          productName: true,
          id: true,
          isDeleted: true,
        },
      },
    },
  });

  if (!version) {
    return res.respond(404, "Master product version not found.");
  }

  return res.respond(
    200,
    "Master product version details fetched successfully!",
    version
  );
});

module.exports = {
  createMasterProduct,
  submitMasterProductUpdateRequest,
  approveMasterProductUpdateRequest,
  rejectMasterProductUpdateRequest,
  getAllMasterProducts,
  getMasterProductDetails,
  getMasterProductVersions,
  getMasterProductVersionById,
};
