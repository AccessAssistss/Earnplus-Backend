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
    deliveryChannel,
    partnerId,
    purposeIds = [],
    segments = [],
    disbursementModeIds = [],
    repaymentModeIds = []
  } = req.body;

  if (
    !productName ||
    !productCategoryId ||
    !productCode ||
    !loanTypeId ||
    !deliveryChannel ||
    !partnerId ||
    purposeIds.length === 0 ||
    disbursementModeIds.length === 0 ||
    repaymentModeIds.length === 0
  ) {
    return res.respond(400, "All fields are required!");
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

  const latestVersion = await prisma.masterProductVersion.findFirst({
    where: { masterProduct: { productName: { equals: productName, mode: "insensitive" } } },
    orderBy: { versionId: 'desc' },
  });

  const newVersionId = latestVersion ? latestVersion.versionId + 1 : 1;

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.masterProduct.create({
      data: {
        productManagerId: productManager.id,
        productCategoryId,
        productName,
        productId: generatedCode,
        productCode,
        productDescription,
        loanTypeId,
        deliveryChannel,
        partnerId,
        versionId: newVersionId,

        MasterProductPurpose: {
          create: purposeIds?.map((purposeId) => ({
            purposeId,
          })),
        },

        MasterProductSegment: {
          create: segments?.map((segmentId) => ({
            segmentId,
          })),
        },

        FinancialDisbursementMode: {
          create: disbursementModeIds.map((disbursementId) => ({
            disbursementId,
          })),
        },

        FinancialRepaymentMode: {
          create: repaymentModeIds.map((repaymentId) => ({
            repaymentId,
          })),
        },
      },
    });

    return product;
  });

  return res.respond(201, "Master Product Created Successfully!", result);
});

// ##########----------Master Product Financial Terms----------##########
const createFinancialTerms = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    masterProductId,
    minLoanAmount,
    maxLoanAmount,
    minTenureMonths,
    maxTenureMonths,
    interestRateType,
    interestRateMin,
    interestRateMax,
    processingFeeType,
    processingFeeValue,
    latePaymentFeeType,
    latePaymentFeeValue,
    prepaymentAllowed,
    prepaymentFeeType,
    prepaymentFeeValue,
    overallGst,
    emiFrequency,
    penalApplicable,
    penalRate,
    gracePeriod,
    renewalFee
  } = req.body;

  if (
    !masterProductId ||
    minLoanAmount == null ||
    maxLoanAmount == null ||
    minTenureMonths == null ||
    maxTenureMonths == null ||
    !interestRateType ||
    interestRateMin == null ||
    interestRateMax == null ||
    !processingFeeType ||
    processingFeeValue == null ||
    !latePaymentFeeType ||
    latePaymentFeeValue == null ||
    prepaymentAllowed == null ||
    !prepaymentFeeType ||
    prepaymentFeeValue == null ||
    !emiFrequency
  ) {
    return res.respond(400, "All fields are required, including disbursement and repayment modes.");
  }

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });
  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can create Financial Terms.");
  }

  const existingTerms = await prisma.financialTerms.findUnique({
    where: { masterProductId },
  });
  if (existingTerms) {
    return res.respond(409, "Financial terms already exist for this Master Product.");
  }

  const terms = await prisma.financialTerms.create({
    data: {
      masterProductId,
      minLoanAmount,
      maxLoanAmount,
      minTenureMonths,
      maxTenureMonths,
      interestRateType,
      interestRateMin,
      interestRateMax,
      processingFeeType,
      processingFeeValue,
      latePaymentFeeType,
      latePaymentFeeValue,
      prepaymentAllowed,
      prepaymentFeeType,
      prepaymentFeeValue,
      overallGst,
      emiFrequency,
      penalApplicable,
      penalRate,
      gracePeriod,
      renewalFee
    },
  });

  return res.respond(201, "Financial Terms Created Successfully!", terms);
});

// ##########----------Master Product Eligibility Criteria----------##########
const createEligibilityCriteria = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    masterProductId,
    minAge,
    maxAge,
    minMonthlyIncome,
    minBusinessVintage,
    minBureauScore,
    coApplicantRequired,
    collateralRequired,
  } = req.body;

  if (
    !masterProductId ||
    minAge == null ||
    maxAge == null ||
    minMonthlyIncome == null ||
    minBusinessVintage == null ||
    minBureauScore == null
  ) {
    return res.respond(400, "Missing required fields.");
  }

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });
  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can create Eligibility Criteria.");
  }

  const existingCriteria = await prisma.eligibilityCriteria.findUnique({
    where: { masterProductId },
  });
  if (existingCriteria) {
    return res.respond(409, "Eligibility criteria already exist for this Master Product.");
  }

  const criteria = await prisma.eligibilityCriteria.create({
    data: {
      masterProductId,
      minAge,
      maxAge,
      minMonthlyIncome,
      minBusinessVintage,
      minBureauScore,
      coApplicantRequired,
      collateralRequired,
    },
  });

  return res.respond(201, "Eligibility Criteria Created Successfully!", criteria);
});

// ##########----------Master Product Credit Bureau----------##########
const createCreditBureauConfig = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    masterProductId,
    creditBureauSources = [],
    minScoreRequired,
    maxActiveLoans,
    maxCreditUtilization,
    enquiriesLast6Months,
    loanDelinquencyAllowed,
    bureauDataFreshnessDays,
    scoreDecayTolerance,
  } = req.body;

  if (
    !masterProductId ||
    minScoreRequired == null ||
    maxActiveLoans == null ||
    maxCreditUtilization == null ||
    enquiriesLast6Months == null ||
    !loanDelinquencyAllowed ||
    bureauDataFreshnessDays == null ||
    scoreDecayTolerance == null
  ) {
    return res.respond(400, "Missing required fields.");
  }

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });
  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can create Credit Bureau Config.");
  }

  const existingConfig = await prisma.creditBureauConfig.findUnique({
    where: { masterProductId },
  });
  if (existingConfig) {
    return res.respond(409, "Credit Bureau Config already exists for this Master Product.");
  }

  const creditBureauConfig = await prisma.creditBureauConfig.create({
    data: {
      masterProductId,
      creditBureauSources,
      minScoreRequired,
      maxActiveLoans,
      maxCreditUtilization,
      enquiriesLast6Months,
      loanDelinquencyAllowed,
      bureauDataFreshnessDays,
      scoreDecayTolerance,
    },
  });

  return res.respond(201, "Credit Bureau Config created successfully!", creditBureauConfig);
});

// ##########----------Create Master Product Other Charges----------##########
const createMasterProductOtherCharges = asyncHandler(async (req, res) => {
  const userId = req.user;

  const {
    masterProductId,
    chequeBounceCharge,
    dublicateNocCharge,
    furnishingCharge,
    chequeSwapCharge,
    revocation,
    documentCopyCharge,
    stampDutyCharge,
    nocCharge,
    incidentalCharge,
  } = req.body;

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });
  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(
      403,
      "Only Product Managers can create variant products."
    );
  }

  const exists = await prisma.masterProduct.findUnique({
    where: { id: masterProductId },
  });
  if (!exists) {
    return res.respond(404, "Master Product not found.");
  }

  const existingCharges = await prisma.masterProductOtherCharges.findUnique({
    where: { masterProductId },
  });
  if (existingCharges) {
    return res.respond(400, "Charges already exists for this master product.");
  }

  const charges = await prisma.masterProductOtherCharges.create({
    data: {
      masterProductId,
      chequeBounceCharge,
      dublicateNocCharge,
      furnishingCharge,
      chequeSwapCharge,
      revocation,
      documentCopyCharge,
      stampDutyCharge,
      nocCharge,
      incidentalCharge,
    },
  });

  return res.respond(201, "Other Charges created!", charges);
});

// ##########----------Create Master Product Fields----------##########
const createMasterProductFields = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    masterProductId,
    isRequired = false,
    fieldIds = [],
    categoryId = null,
  } = req.body;

  if (!masterProductId || fieldIds.length === 0) {
    return res.respond(400, "masterProductId and fieldIds are required!");
  }
  
  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can create product fields.");
  }

  const exists = await prisma.masterProduct.findUnique({
    where: { id: masterProductId },
  });
  if (!exists) {
    return res.respond(404, "Master Product not found.");
  }

  if (categoryId) {
    const categoryExists = await prisma.fieldCategory.findFirst({
      where: { id: categoryId, isDeleted: false },
    });
    if (!categoryExists) {
      return res.respond(404, "Category not found or deleted.");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const createdFields = await tx.masterProductField.createMany({
      data: fieldIds.map((fieldId) => ({
        masterProductId,
        fieldId,
        categoryId,
        isRequired,
      })),
      skipDuplicates: true,
    });

    return createdFields;
  });

  return res.respond(201, "Master Product Fields Created Successfully!", result);
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

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const totalCount = await prisma.masterProduct.count({
    where: {
      isDeleted: false,
    },
  });

  const masterProducts = await prisma.masterProduct.findMany({
    where: {
      isDeleted: false,
    },
    select: {
      id: true,
      productName: true,
      productCode: true,
      productId: true,
      productDescription: true,
      deliveryChannel: true,
      versionId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          VariantProduct: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: limit,
  });

  const formattedProducts = masterProducts.map((product) => {
    const { _count, ...rest } = product;
    return {
      ...rest,
      VariantProduct: _count?.VariantProduct || 0,
    };
  });

  res.respond(200, "Master Products fetched successfully!", {
    totalItems: totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    pageSize: limit,
    data: formattedProducts,
  });
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

  const masterProduct = await prisma.masterProduct.findFirst({
    where: {
      id: productId,
      isDeleted: false,
    },
    select: {
      id: true,
      productName: true,
      productCode: true,
      productId: true,
      productDescription: true,
      deliveryChannel: true,
      versionId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      productCategory: {
        select: {
          id: true,
          categoryName: true,
        },
      },
      loanType: {
        select: {
          id: true,
          name: true,
        },
      },
      productPartner: {
        select: {
          id: true,
          name: true,
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
      MasterProductSegment: {
        select: {
          id: true,
          productSegment: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      FinancialDisbursementMode: {
        select: {
          id: true,
          disbursementMode: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      FinancialRepaymentMode: {
        select: {
          id: true,
          RepaymentModes: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      financialTerms: {
        select: {
          id: true,
          minLoanAmount: true,
          maxLoanAmount: true,
          maxLoanAmount: true,
          minTenureMonths: true,
          maxTenureMonths: true,
          interestRateType: true,
          interestRateMin: true,
          interestRateMax: true,
          processingFeeType: true,
          processingFeeValue: true,
          latePaymentFeeType: true,
          latePaymentFeeValue: true,
          prepaymentAllowed: true,
          prepaymentFeeType: true,
          prepaymentFeeValue: true,
          overallGst: true,
          emiFrequency: true,
          penalApplicable: true,
          penalRate: true,
          gracePeriod: true,
          renewalFee: true,
        },
      },
      eligibilityCriteria: {
        select: {
          id: true,
          minAge: true,
          maxAge: true,
          minMonthlyIncome: true,
          minBusinessVintage: true,
          minBureauScore: true,
          coApplicantRequired: true,
          collateralRequired: true,
        },
      },
      creditBureauConfig: {
        select: {
          id: true,
          creditBureauSources: true,
          minScoreRequired: true,
          maxActiveLoans: true,
          maxCreditUtilization: true,
          enquiriesLast6Months: true,
          loanDelinquencyAllowed: true,
          bureauDataFreshnessDays: true,
          scoreDecayTolerance: true,
        },
      },
      masterProductOtherCharges: {
        select: {
          id: true,
          chequeBounceCharge: true,
          dublicateNocCharge: true,
          furnishingCharge: true,
          chequeSwapCharge: true,
          revocation: true,
          documentCopyCharge: true,
          stampDutyCharge: true,
          nocCharge: true,
          incidentalCharge: true,
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

  res.respond(200, "Master Product Details fetched successfully!", masterProduct);
});

// ####################--------------------Mater Product EDIT And DELETE Requests Handeling--------------------####################
// ##########----------Master Product Update Request----------##########
const submitMasterProductUpdateRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    masterProductId,
    productCategoryId,
    productName,
    productDescription,
    loanTypeId,
    deliveryChannel,
    partnerId,
    financialTermsUpdate,
    eligibilityCriteriaUpdate,
    creditBureauConfigUpdate,
    otherChargesUpdate,
    complianceDocumentUpdate,
    purposeIds,
    segmentIds,
    disbursementModeIds,
    repaymentModeIds,
  } = req.body;

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

  const updateRequest = await prisma.$transaction(async (tx) => {
    return await tx.masterProductUpdateRequest.create({
      data: {
        productManager: {
          connect: { id: productManager.id }
        },
        masterProduct: {
          connect: { id: masterProductId }
        },
        productCategory: {
          connect: { id: productCategoryId }
        },
        loanType: {
          connect: { id: loanTypeId }
        },
        productPartner: {
          connect: { id: partnerId }
        },
        productName,
        productDescription,
        deliveryChannel,

        financialTermsUpdate: financialTermsUpdate
          ? { create: financialTermsUpdate }
          : undefined,

        eligibilityCriteriaUpdate: eligibilityCriteriaUpdate
          ? { create: eligibilityCriteriaUpdate }
          : undefined,

        creditBureauConfigUpdate: creditBureauConfigUpdate
          ? { create: creditBureauConfigUpdate }
          : undefined,

        masterProductOtherChargesUpdate: otherChargesUpdate
          ? {
            create: otherChargesUpdate,
          }
          : undefined,

        masterProductComplianceDocument: masterProductComplianceDocument
          ? {
            create: {
              ...(() => {
                const {
                  documentIds = [],
                  ...cleanData
                } = masterProductComplianceDocument;

                return {
                  ...cleanData,
                  ProductDocuments: {
                    create: documentIds?.map((documentId) => ({ documentId })),
                  },
                };
              })(),
            },
          }
          : undefined,

        MasterProductPurposeUpdate: purposeIds
          ? {
            create: purposeIds.map((purposeId) => ({ purposeId }))
          }
          : undefined,

        MasterProductSegmentUpdate: segmentIds
          ? {
            create: segmentIds.map((segmentId) => ({ segmentId }))
          }
          : undefined,

        FinancialDisbursementModeUpdate: disbursementModeIds
          ? {
            create: disbursementModeIds.map((disbursementModeId) => ({ disbursementModeId }))
          }
          : undefined,
        FinancialRepaymentModeUpdate: repaymentModeIds
          ? {
            create: repaymentModeIds.map((repaymentModeId) => ({ repaymentModeId }))
          }
          : undefined,
      }
    });
  });

  res.respond(
    201,
    "Master Product Update Request Submitted Successfully!",
    updateRequest
  );
});

// ##########----------Get Master Product Update Requests----------##########
const getAllMasterProductUpdateRequests = asyncHandler(async (req, res) => {
  const userId = req.user;

  const updateRequests = await prisma.masterProductUpdateRequest.findMany({
    include: {
      masterProduct: {
        select: {
          id: true,
          productCode: true,
          productId: true,
        },
      },
      productManager: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  res.respond(200, "Fetched all update requests successfully.", updateRequests);
});

// ##########----------Get Master Product Update Request Details----------##########
const getMasterProductUpdateRequestDetails = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { updateProductId } = req.params;

  const associate = await prisma.associate.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!associate) {
    return res.respond(403, "Associate not found.");
  }

  const masterProductUpdate = await prisma.masterProductUpdateRequest.findMany({
    where: {
      id: updateProductId,
    },
    select: {
      id: true,
      productName: true,
      productDescription: true,
      deliveryChannel: true,
      createdAt: true,
      updatedAt: true,
      productCategory: {
        select: {
          id: true,
          categoryName: true,
        },
      },
      loanType: {
        select: {
          id: true,
          name: true,
        },
      },
      productPartner: {
        select: {
          id: true,
          name: true,
        },
      },
      MasterProductPurposeUpdate: {
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
      MasterProductSegmentUpdate: {
        select: {
          id: true,
          productSegment: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      FinancialDisbursementModeUpdate: {
        select: {
          id: true,
          DisbursementMode: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      FinancialRepaymentModeUpdate: {
        select: {
          id: true,
          RepaymentModes: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      financialTermsUpdate: {
        select: {
          id: true,
          minLoanAmount: true,
          maxLoanAmount: true,
          maxLoanAmount: true,
          minTenureMonths: true,
          maxTenureMonths: true,
          interestRateType: true,
          interestRateMin: true,
          interestRateMax: true,
          processingFeeType: true,
          processingFeeValue: true,
          latePaymentFeeType: true,
          latePaymentFeeValue: true,
          prepaymentAllowed: true,
          prepaymentFeeType: true,
          prepaymentFeeValue: true,
          overallGst: true,
          emiFrequency: true,
          penalApplicable: true,
          penalRate: true,
          gracePeriod: true,
          renewalFee: true,
        },
      },
      eligibilityCriteriaUpdate: {
        select: {
          id: true,
          minAge: true,
          maxAge: true,
          minMonthlyIncome: true,
          minBusinessVintage: true,
          minBureauScore: true,
          coApplicantRequired: true,
          collateralRequired: true,
        },
      },
      creditBureauConfigUpdate: {
        select: {
          id: true,
          creditBureauSources: true,
          minScoreRequired: true,
          maxActiveLoans: true,
          maxCreditUtilization: true,
          enquiriesLast6Months: true,
          loanDelinquencyAllowed: true,
          bureauDataFreshnessDays: true,
          scoreDecayTolerance: true,
        },
      },
      masterProductOtherChargesUpdate: {
        select: {
          id: true,
          chequeBounceCharge: true,
          dublicateNocCharge: true,
          furnishingCharge: true,
          chequeSwapCharge: true,
          revocation: true,
          documentCopyCharge: true,
          stampDutyCharge: true,
          nocCharge: true,
          incidentalCharge: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  if (!masterProductUpdate) {
    return res.respond(404, "Product not found or access denied.");
  }

  res.respond(200, "Master Product update request Details fetched successfully!", masterProductUpdate);
});

// ##########----------Approve Master Product Update Request----------##########
const approveMasterProductUpdateRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { requestId } = req.params;

  const associate = await prisma.associate.findFirst({
    where: { userId, isDeleted: false },
  });
  if (!associate) {
    return res.respond(403, "Only associates can approve update requests.");
  }

  const updateRequest = await prisma.masterProductUpdateRequest.findUnique({
    where: { id: requestId },
    include: {
      masterProduct: true,
      financialTermsUpdate: true,
      eligibilityCriteriaUpdate: true,
      creditBureauConfigUpdate: true,
      MasterProductPurposeUpdate: true,
      MasterProductSegmentUpdate: true,
      FinancialDisbursementModeUpdate: true,
      FinancialRepaymentModeUpdate: true,
      masterProductOtherChargesUpdate: true,
    },
  });

  if (!updateRequest) {
    return res.respond(404, "Update request not found.");
  }

  const sanitizeUpdateData = (obj, excludeKeys = ["id", "updateRequestId", "createdAt", "updatedAt", "masterProductId", "updateRequestID"]) => {
    if (Array.isArray(obj)) {
      return obj.map((item) => sanitizeUpdateData(item, excludeKeys));
    } else if (typeof obj === "object" && obj !== null) {
      return Object.entries(obj).reduce((acc, [key, value]) => {
        if (!excludeKeys.includes(key)) {
          acc[key] = sanitizeUpdateData(value, excludeKeys);
        }
        return acc;
      }, {});
    }
    return obj;
  };

  const currentProduct = updateRequest.masterProduct;
  const newVersionId = currentProduct.versionId + 1;

  const updatedMasterProduct = await prisma.$transaction(async (tx) => {
    const oldProductSnapshot = await tx.masterProduct.findUnique({
      where: { id: currentProduct.id },
      include: {
        MasterProductPurpose: true,
        MasterProductSegment: true,
        FinancialDisbursementMode: true,
        FinancialRepaymentMode: true,
        financialTerms: true,
        eligibilityCriteria: true,
        creditBureauConfig: true,
        masterProductOtherCharges: true,
      },
    });

    await tx.masterProductVersion.create({
      data: {
        masterProductId: currentProduct.id,
        versionId: currentProduct.versionId,
        snapshot: JSON.parse(JSON.stringify(oldProductSnapshot)),
      },
    });

    const sanitizedUpdate = {
      financialTermsUpdate: sanitizeUpdateData(updateRequest.financialTermsUpdate),
      eligibilityCriteriaUpdate: sanitizeUpdateData(updateRequest.eligibilityCriteriaUpdate),
      creditBureauConfigUpdate: sanitizeUpdateData(updateRequest.creditBureauConfigUpdate),
      MasterProductPurposeUpdate: sanitizeUpdateData(updateRequest.MasterProductPurposeUpdate),
      MasterProductSegmentUpdate: sanitizeUpdateData(updateRequest.MasterProductSegmentUpdate),
      FinancialDisbursementModeUpdate: sanitizeUpdateData(updateRequest.FinancialDisbursementModeUpdate),
      FinancialRepaymentModeUpdate: sanitizeUpdateData(updateRequest.FinancialRepaymentModeUpdate),
      masterProductOtherChargesUpdate: sanitizeUpdateData(updateRequest.masterProductOtherChargesUpdate),
    };

    function parseSafeDate(dateValue) {
      if (!dateValue) return null;
      const date = new Date(dateValue);
      return date instanceof Date && !isNaN(date) ? date : null;
    }

    const updatedProduct = await tx.masterProduct.update({
      where: { id: currentProduct.id },
      data: {
        versionId: newVersionId,
        productName: updateRequest.productName,
        productDescription: updateRequest.productDescription,
        deliveryChannel: updateRequest.deliveryChannel,
        productCategory: {
          connect: { id: updateRequest.productCategoryId }
        },
        loanType: {
          connect: { id: updateRequest.loanTypeId }
        },
        productPartner: {
          connect: { id: updateRequest.partnerId }
        },

        MasterProductPurpose: {
          deleteMany: {},
          create: sanitizedUpdate.MasterProductPurposeUpdate.map((p) => ({
            purposeId: p.purposeId,
          })),
        },
        MasterProductSegment: {
          deleteMany: {},
          create: sanitizedUpdate.MasterProductSegmentUpdate.map((s) => ({
            segmentId: s.segmentId,
          })),
        },
        FinancialDisbursementMode: {
          deleteMany: {},
          create: sanitizedUpdate.FinancialDisbursementModeUpdate.map((s) => ({
            disbursementId: s.disbursementId,
          })),
        },
        FinancialRepaymentMode: {
          deleteMany: {},
          create: sanitizedUpdate.FinancialRepaymentModeUpdate.map((s) => ({
            repaymentId: s.repaymentId,
          })),
        },

        financialTerms: sanitizedUpdate.financialTermsUpdate && {
          upsert: {
            update: sanitizedUpdate.financialTermsUpdate,
            create: sanitizedUpdate.financialTermsUpdate,
          }
        },

        eligibilityCriteria: sanitizedUpdate.eligibilityCriteriaUpdate && {
          upsert: {
            update: sanitizedUpdate.eligibilityCriteriaUpdate,
            create: sanitizedUpdate.eligibilityCriteriaUpdate,
          }
        },

        creditBureauConfig: sanitizedUpdate.creditBureauConfigUpdate && {
          upsert: {
            update: sanitizedUpdate.creditBureauConfigUpdate,
            create: sanitizedUpdate.creditBureauConfigUpdate,
          }
        },

        masterProductOtherCharges: sanitizedUpdate.masterProductOtherChargesUpdate && {
          upsert: {
            update: sanitizedUpdate.masterProductOtherChargesUpdate,
            create: sanitizedUpdate.masterProductOtherChargesUpdate,
          }
        },
      },
    });

    await tx.masterProductUpdateRequest.update({
      where: { id: requestId },
      data: {
        isApproved: true,
        isDeleted: true,
      }
    });

    return updatedProduct;
  });

  res.respond(200, "Master Product update approved and applied successfully.", updatedMasterProduct);
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

// ##########----------Create Master Product Delete Request----------##########
const createMasterProductDeleteRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { masterProductId, reason } = req.body;

  const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
  });
  if (!associateSubAdmin) {
    return res.respond(403, "associate subadmin not found!");
  }

  const product = await prisma.masterProduct.findFirst({
    where: {
      id: masterProductId,
      isDeleted: false,
    },
  });
  if (!product) {
    return res.respond(404, "MasterProduct not found or already deleted!");
  }

  const existingRequest = await prisma.masterProductDeleteRequest.findFirst({
    where: {
      masterProductId,
      status: 'PENDING',
    },
  });
  if (existingRequest) {
    return res.respond(400, "A delete request is already pending for this product!");
  }

  const deleteRequest = await prisma.masterProductDeleteRequest.create({
    data: {
      masterProductId,
      reason,
      requestedById: associateSubAdmin.id,
    },
  });

  return res.respond(200, "Delete request submitted successfully!", deleteRequest);
});

// ##########----------Get Master Product Delete Requests----------##########
const getMasterProductDeleteRequests = asyncHandler(async (req, res) => {
  const userId = req.user;

  const associate = await prisma.associate.findFirst({
    where: { userId, isDeleted: false },
  });
  if (!associate) {
    return res.respond(404, "Associate not found!");
  }

  const whereClause = {
    isDeleted: false,
  };

  const requests = await prisma.masterProductDeleteRequest.findMany({
    where: whereClause,
    include: {
      masterProduct: true,
      requestedBy: {
        select: {
          id: true,
          name: true,
        }
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return res.respond(200, "Delete requests fetched successfully!", requests);
});

// ##########----------Handle Master Product Delete Request----------##########
const handleMasterProductDeleteRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { requestId, action, reason } = req.body;

  if (!["APPROVED", "REJECTED"].includes(action)) {
    return res.respond(400, "Invalid action. Must be APPROVED or REJECTED.");
  }

  const associate = await prisma.associate.findFirst({
    where: { userId, isDeleted: false },
  });
  if (!associate) {
    return res.respond(404, "Associate not found!");
  }

  const request = await prisma.masterProductDeleteRequest.findUnique({
    where: { id: requestId },
    include: { masterProduct: true },
  });
  if (!request || request.status !== "PENDING") {
    return res.respond(404, "Valid pending delete request not found.");
  }

  const actions = [];

  if (action === "APPROVED") {
    actions.push(
      prisma.masterProduct.update({
        where: { id: masterProductId },
        data: { isDeleted: true },
      })
    );

    const variantProducts = await prisma.variantProduct.findMany({
      where: { masterProductId, isDeleted: false },
      select: { id: true },
    });

    const variantProductIds = variantProducts.map((vp) => vp.id);

    actions.push(
      prisma.variantProduct.updateMany({
        where: { id: { in: variantProductIds } },
        data: { isDeleted: true },
      })
    );

    actions.push(
      prisma.assignVariantProductToEmployer.updateMany({
        where: {
          variantProductId: { in: variantProductIds },
          isDeleted: false,
        },
        data: { isDeleted: true },
      })
    );

    actions.push(
      prisma.variantProductUpdateRequest.updateMany({
        where: {
          variantProductId: { in: variantProductIds },
          isDeleted: false,
        },
        data: { isDeleted: true },
      })
    );

    actions.push(
      prisma.variantProductDeleteRequest.updateMany({
        where: {
          variantProductId: { in: variantProductIds },
          isDeleted: false,
        },
        data: { isDeleted: true },
      })
    );

    actions.push(
      prisma.masterProductUpdateRequest.updateMany({
        where: {
          masterProductId,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
        },
      })
    );
  }

  actions.push(
    prisma.masterProductDeleteRequest.update({
      where: { id: requestId },
      data: {
        status: action,
        reason: reason || request.reason,
        isDeleted: true,
      },
    })
  );

  await prisma.$transaction(actions);

  return res.respond(200, `Delete request ${action.toLowerCase()} successfully!`);
});

// ####################--------------------Mater Product Version Handeling--------------------####################
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
  createFinancialTerms,
  createEligibilityCriteria,
  createCreditBureauConfig,
  createMasterProductOtherCharges,
  createMasterProductFields,
  getAllMasterProducts,
  getMasterProductDetails,
  submitMasterProductUpdateRequest,
  getAllMasterProductUpdateRequests,
  getMasterProductUpdateRequestDetails,
  approveMasterProductUpdateRequest,
  rejectMasterProductUpdateRequest,
  createMasterProductDeleteRequest,
  getMasterProductDeleteRequests,
  handleMasterProductDeleteRequest,
  getMasterProductVersions,
  getMasterProductVersionById,
};
