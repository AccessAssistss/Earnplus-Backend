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

  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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

  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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

  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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
  getMasterProductVersions,
  getMasterProductVersionById,
};
