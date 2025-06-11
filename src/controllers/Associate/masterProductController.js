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
    status,
    purposeIds = [],
    segments = []
  } = req.body;

  if (
    !productName ||
    !productCategoryId ||
    !productCode ||
    !loanTypeId ||
    !deliveryChannel ||
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
        status,
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
    emiFrequency,
    disbursementModeIds = [],
    repaymentModeIds = []
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
    !emiFrequency ||
    disbursementModeIds.length === 0 ||
    repaymentModeIds.length === 0
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

  const result = await prisma.$transaction(async (tx) => {
    const terms = await tx.financialTerms.create({
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
        emiFrequency,

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

    return terms;
  });

  return res.respond(201, "Financial Terms Created Successfully!", result);
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
    bureauType,
    blacklistFlags = [],
    minDocumentsRequired = [],
    documentSubmissionModes = [],
    documentVerificationModes = [],
    employmentTypesAllowed = []
  } = req.body;

  if (
    !masterProductId ||
    minAge == null ||
    maxAge == null ||
    minMonthlyIncome == null ||
    minBusinessVintage == null ||
    minBureauScore == null ||
    !bureauType
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

  const result = await prisma.$transaction(async (tx) => {
    const criteria = await tx.eligibilityCriteria.create({
      data: {
        masterProductId,
        minAge,
        maxAge,
        minMonthlyIncome,
        minBusinessVintage,
        minBureauScore,
        bureauType,
        blacklistFlags,
        documentSubmissionModes,
        documentVerificationModes,

        minDocumentsRequired: {
          create: minDocumentsRequired.map((documentId) => ({
            documentId,
          })),
        },
        employmentTypesAllowed: {
          create: employmentTypesAllowed.map((employmentId) => ({
            employmentId,
          })),
        },
      },
    });

    return criteria;
  });

  return res.respond(201, "Eligibility Criteria Created Successfully!", result);
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
    customBureauFlags = [],
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
      customBureauFlags,
      scoreDecayTolerance,
    },
  });

  return res.respond(201, "Credit Bureau Config created successfully!", creditBureauConfig);
});

// ##########----------Master Product Financial Statement----------##########
const createFinancialStatements = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    masterProductId,
    minMonthlyCredit,
    minAverageBalance,
    salaryCreditPattern,
    bouncesLast3Months,
    netIncomeRecognition,
    cashDepositsCapPercent,
    statementSources = [],
    accountTypes = [],
    pdfParsingRequired,
  } = req.body;

  if (
    !masterProductId ||
    minMonthlyCredit == null ||
    minAverageBalance == null ||
    !salaryCreditPattern ||
    bouncesLast3Months == null ||
    !netIncomeRecognition ||
    cashDepositsCapPercent == null ||
    pdfParsingRequired == null
  ) {
    return res.respond(400, "Missing required fields.");
  }

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can create Financial Statements.");
  }

  const existingStatement = await prisma.financialStatements.findUnique({
    where: { masterProductId },
  });

  if (existingStatement) {
    return res.respond(409, "Financial Statements already exist for this Master Product.");
  }

  const financialStatements = await prisma.financialStatements.create({
    data: {
      masterProductId,
      minMonthlyCredit,
      minAverageBalance,
      salaryCreditPattern,
      bouncesLast3Months,
      netIncomeRecognition,
      cashDepositsCapPercent,
      statementSources,
      accountTypes,
      pdfParsingRequired,
    },
  });

  return res.respond(201, "Financial Statements created successfully!", financialStatements);
});

// ##########----------Master Product Behavioral Data----------##########
const createBehavioralData = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    masterProductId,
    salaryRegularityThreshold,
    spendingConsistencyPercent,
    upiSpendToIncomeRatio,
    billPaymentHistory,
    digitalFootprintRequired,
    locationConsistencyKm,
    repeatBorrowerBehavior,
  } = req.body;

  if (
    !masterProductId ||
    salaryRegularityThreshold == null ||
    spendingConsistencyPercent == null ||
    upiSpendToIncomeRatio == null ||
    !billPaymentHistory ||
    digitalFootprintRequired == null ||
    locationConsistencyKm == null ||
    !repeatBorrowerBehavior
  ) {
    return res.respond(400, "Missing required fields.");
  }

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can create Behavioral Data.");
  }

  const existingData = await prisma.behavioralData.findUnique({
    where: { masterProductId },
  });

  if (existingData) {
    return res.respond(409, "Behavioral Data already exists for this Master Product.");
  }

  const behavioralData = await prisma.behavioralData.create({
    data: {
      masterProductId,
      salaryRegularityThreshold,
      spendingConsistencyPercent,
      upiSpendToIncomeRatio,
      billPaymentHistory,
      digitalFootprintRequired,
      locationConsistencyKm,
      repeatBorrowerBehavior,
    },
  });

  return res.respond(201, "Behavioral Data created successfully!", behavioralData);
});

// ##########----------Master Product Risk Scoring----------##########
const createRiskScoring = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    masterProductId,
    internalScoreVars,
    externalScoreInputs,
    riskCategoryMapping,
    maxDTI,
    maxLTV,
    coBorrowerRequired,
  } = req.body;

  if (
    !masterProductId ||
    !Array.isArray(internalScoreVars) ||
    !Array.isArray(externalScoreInputs) ||
    riskCategoryMapping == null ||
    maxDTI == null ||
    maxLTV == null ||
    coBorrowerRequired == null
  ) {
    return res.respond(400, "Missing or invalid required fields.");
  }

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can create Risk Scoring.");
  }

  const existing = await prisma.riskScoring.findUnique({
    where: { masterProductId },
  });

  if (existing) {
    return res.respond(409, "Risk Scoring already exists for this Master Product.");
  }

  const riskScoring = await prisma.riskScoring.create({
    data: {
      masterProductId,
      riskCategoryMapping,
      maxDTI,
      maxLTV,
      coBorrowerRequired,
      internalScoreVars: {
        create: internalScoreVars.map(scoreId => ({
          scoreId,
        })),
      },
      externalScoreInputs: {
        create: externalScoreInputs.map(externalId => ({
          externalId,
        })),
      },
    },
  });

  return res.respond(201, "Risk Scoring created successfully!", riskScoring);
});

// ##########----------Master Product Collateral----------##########
const createCollateral = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    masterProductId,
    collateralType,
    collateralValue,
    collateralValuationDate,
    collateralDocs,
    collateralOwnerName,
    ownershipVerified,
    guarantorRequired,
    guarantorName,
    guarantorRelationship,
    guarantorPAN,
    guarantorCreditBureau,
    guarantorCreditScore,
    guarantorMonthlyIncome,
    guarantorIncomeProofTypes,
    guarantorVerificationStatus,
  } = req.body;

  if (
    !masterProductId ||
    !collateralType ||
    !collateralValue ||
    !collateralValuationDate ||
    !collateralOwnerName ||
    ownershipVerified === undefined ||
    guarantorRequired === undefined
  ) {
    return res.respond(400, "Missing required fields.");
  }

  const isAuthorized = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
  });
  if (!isAuthorized) {
    return res.respond(403, "Unauthorized.");
  }

  const collateral = await prisma.collateral.create({
    data: {
      masterProductId,
      collateralType,
      collateralValue,
      collateralValuationDate: new Date(collateralValuationDate),
      collateralOwnerName,
      ownershipVerified,
      guarantorRequired,
      guarantorName,
      guarantorRelationship,
      guarantorPAN,
      guarantorCreditBureau,
      guarantorCreditScore,
      guarantorMonthlyIncome,
      guarantorVerificationStatus,
      guarantorIncomeProofTypes,
      collateralDocs: {
        create: (collateralDocs || []).map((docId) => ({
          docId,
        })),
      },
    },
    include: {
      collateralDocs: {
        include: {
          OwnershipDocument: true,
        },
      },
    },
  });

  return res.respond(201, "Collateral created successfully!", collateral);
});

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
    financialStatementsUpdate,
    behavioralDataUpdate,
    riskScoringUpdate,
    collateralUpdate,
    purposeIds,
    segmentIds
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
          ? {
            create: {
              ...(() => {
                const {
                  disbursementModeIds = [],
                  repaymentModeIds = [],
                  ...cleanData
                } = financialTermsUpdate;

                return {
                  ...cleanData,
                  FinancialDisbursementModeUpdate: {
                    create: disbursementModeIds?.map((disbursementId) => ({ disbursementId })),
                  },
                  FinancialRepaymentModeUpdate: {
                    create: repaymentModeIds?.map((repaymentId) => ({ repaymentId })),
                  },
                };
              })(),
            },
          }
          : undefined,

        eligibilityCriteriaUpdate: eligibilityCriteriaUpdate && {
          create: {
            ...(() => {
              const {
                documentIds = [],
                employmentIds = [],
                ...rest
              } = eligibilityCriteriaUpdate;

              return {
                ...rest,
                minDocumentsRequired: {
                  create: documentIds.map((documentId) => ({ documentId })),
                },
                employmentTypesAllowed: {
                  create: employmentIds.map((employmentId) => ({ employmentId })),
                },
              };
            })()
          }
        },

        creditBureauConfigUpdate: creditBureauConfigUpdate
          ? { create: creditBureauConfigUpdate }
          : undefined,

        financialStatementsUpdate: financialStatementsUpdate
          ? { create: financialStatementsUpdate }
          : undefined,

        behavioralDataUpdate: behavioralDataUpdate
          ? { create: behavioralDataUpdate }
          : undefined,

        riskScoringUpdate: riskScoringUpdate && {
          create: {
            ...(() => {
              const {
                scoreVariableIds = [],
                externalScoreIds = [],
                ...rest
              } = riskScoringUpdate;

              return {
                ...rest,
                internalScoreVars: {
                  create: scoreVariableIds.map((scoreId) => ({ scoreId })),
                },
                externalScoreInputs: {
                  create: externalScoreIds.map((externalId) => ({ externalId })),
                },
              };
            })()
          }
        },

        CollateralUpdate: collateralUpdate && {
          create: {
            ...(() => {
              const {
                documentIds = [],
                ...rest
              } = collateralUpdate;

              return {
                ...rest,
                collateralDocs: {
                  create: documentIds.map((docId) => ({ docId })),
                },
              };
            })()
          }
        },

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
      }
    });
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
    return res.respond(403, "Only associates can approve update requests.");
  }

  const updateRequest = await prisma.masterProductUpdateRequest.findUnique({
    where: { id: requestId },
    include: {
      masterProduct: true,
      financialTermsUpdate: {
        include: {
          FinancialDisbursementModeUpdate: true,
          FinancialRepaymentModeUpdate: true,
        }
      },
      eligibilityCriteriaUpdate: {
        include: {
          minDocumentsRequired: true,
          employmentTypesAllowed: true,
        }
      },
      creditBureauConfigUpdate: true,
      financialStatementsUpdate: true,
      behavioralDataUpdate: true,
      riskScoringUpdate: {
        include: {
          internalScoreVars: true,
          externalScoreInputs: true,
        }
      },
      CollateralUpdate: {
        include: {
          collateralDocs: true,
        }
      },
      MasterProductPurposeUpdate: true,
      MasterProductSegmentUpdate: true,
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

  const oldProductSnapshot = await tx.masterProduct.findUnique({
    where: { id: currentProduct.id },
    include: {
      MasterProductPurpose: true,
      MasterProductSegment: true,
      financialTerms: {
        include: {
          FinancialDisbursementMode: true,
          FinancialRepaymentMode: true,
        },
      },
      eligibilityCriteria: {
        include: {
          minDocumentsRequired: true,
          employmentTypesAllowed: true,
        },
      },
      creditBureauConfig: true,
      financialStatements: true,
      behavioralData: true,
      riskScoring: {
        include: {
          internalScoreVars: true,
          externalScoreInputs: true,
        },
      },
      Collateral: {
        include: {
          collateralDocs: true,
        },
      },
    },
  });

  const updatedMasterProduct = await prisma.$transaction(async (tx) => {
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
      financialStatementsUpdate: sanitizeUpdateData(updateRequest.financialStatementsUpdate),
      behavioralDataUpdate: sanitizeUpdateData(updateRequest.behavioralDataUpdate),
      riskScoringUpdate: sanitizeUpdateData(updateRequest.riskScoringUpdate),
      CollateralUpdate: sanitizeUpdateData(updateRequest.CollateralUpdate),
      MasterProductPurposeUpdate: sanitizeUpdateData(updateRequest.MasterProductPurposeUpdate),
      MasterProductSegmentUpdate: sanitizeUpdateData(updateRequest.MasterProductSegmentUpdate),
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

        financialTerms: sanitizedUpdate.financialTermsUpdate && {
          upsert: {
            update: {
              FinancialDisbursementMode: {
                deleteMany: {},
                create: sanitizedUpdate.financialTermsUpdate.FinancialDisbursementModeUpdate?.map(d => ({
                  disbursementId: d.disbursementId
                })),
              },
              FinancialRepaymentMode: {
                deleteMany: {},
                create: sanitizedUpdate.financialTermsUpdate.FinancialRepaymentModeUpdate?.map(r => ({
                  repaymentId: r.repaymentId
                })),
              },
              ...(() => {
                const {
                  FinancialDisbursementModeUpdate,
                  FinancialRepaymentModeUpdate,
                  ...rest
                } = sanitizedUpdate.financialTermsUpdate;
                return rest;
              })()
            },
            create: {
              FinancialDisbursementMode: {
                create: sanitizedUpdate.financialTermsUpdate.FinancialDisbursementModeUpdate?.map(d => ({
                  disbursementId: d.disbursementId
                })),
              },
              FinancialRepaymentMode: {
                create: sanitizedUpdate.financialTermsUpdate.FinancialRepaymentModeUpdate?.map(r => ({
                  repaymentId: r.repaymentId
                })),
              },
              ...(() => {
                const {
                  FinancialDisbursementModeUpdate,
                  FinancialRepaymentModeUpdate,
                  ...rest
                } = sanitizedUpdate.financialTermsUpdate;
                return rest;
              })()
            }
          }
        },

        eligibilityCriteria: sanitizedUpdate.eligibilityCriteriaUpdate && {
          upsert: {
            update: {
              ...sanitizedUpdate.eligibilityCriteriaUpdate,
              minDocumentsRequired: {
                deleteMany: {},
                create: sanitizedUpdate.eligibilityCriteriaUpdate.minDocumentsRequired?.map(d => ({
                  documentId: d.documentId
                }))
              },
              employmentTypesAllowed: {
                deleteMany: {},
                create: sanitizedUpdate.eligibilityCriteriaUpdate.employmentTypesAllowed?.map(e => ({
                  employmentId: e.employmentId
                }))
              }
            },
            create: {
              ...sanitizedUpdate.eligibilityCriteriaUpdate,
              minDocumentsRequired: {
                create: sanitizedUpdate.eligibilityCriteriaUpdate.minDocumentsRequired?.map(d => ({
                  documentId: d.documentId
                }))
              },
              employmentTypesAllowed: {
                create: sanitizedUpdate.eligibilityCriteriaUpdate.employmentTypesAllowed?.map(e => ({
                  employmentId: e.employmentId
                }))
              }
            }
          }
        },

        creditBureauConfig: sanitizedUpdate.creditBureauConfigUpdate && {
          upsert: {
            update: sanitizedUpdate.creditBureauConfigUpdate,
            create: sanitizedUpdate.creditBureauConfigUpdate,
          }
        },

        financialStatements: sanitizedUpdate.financialStatementsUpdate && {
          upsert: {
            update: sanitizedUpdate.financialStatementsUpdate,
            create: sanitizedUpdate.financialStatementsUpdate,
          }
        },

        behavioralData: sanitizedUpdate.behavioralDataUpdate && {
          upsert: {
            update: sanitizedUpdate.behavioralDataUpdate,
            create: sanitizedUpdate.behavioralDataUpdate,
          }
        },

        riskScoring: sanitizedUpdate.riskScoringUpdate && {
          upsert: {
            update: {
              ...sanitizedUpdate.riskScoringUpdate,
              internalScoreVars: {
                deleteMany: {},
                create: sanitizedUpdate.riskScoringUpdate.internalScoreVars?.map((s) => ({
                  scoreId: s.scoreId,
                })),
              },
              externalScoreInputs: {
                deleteMany: {},
                create: sanitizedUpdate.riskScoringUpdate.externalScoreInputs?.map((e) => ({
                  externalId: e.externalId,
                })),
              },
            },
            create: {
              ...sanitizedUpdate.riskScoringUpdate,
              internalScoreVars: {
                create: sanitizedUpdate.riskScoringUpdate.internalScoreVars?.map((s) => ({
                  scoreId: s.scoreId,
                })),
              },
              externalScoreInputs: {
                create: sanitizedUpdate.riskScoringUpdate.externalScoreInputs?.map((e) => ({
                  externalId: e.externalId,
                })),
              },
            }
          }
        },

        Collateral: sanitizedUpdate.CollateralUpdate && {
          upsert: {
            update: {
              ...sanitizedUpdate.CollateralUpdate,
              collateralValuationDate: parseSafeDate(sanitizedUpdate.CollateralUpdate.collateralValuationDate) || new Date(),
              collateralDocs: {
                deleteMany: {},
                create: sanitizedUpdate.CollateralUpdate.collateralDocs?.map((d) => ({
                  docId: d.docId,
                })),
              },
            },
            create: {
              ...sanitizedUpdate.CollateralUpdate,
              collateralValuationDate: parseSafeDate(sanitizedUpdate.CollateralUpdate.collateralValuationDate) || new Date(),
              collateralDocs: {
                create: sanitizedUpdate.CollateralUpdate.collateralDocs?.map((d) => ({
                  docId: d.docId,
                })),
              },
            }
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

// ##########----------Approve Master Product Delete Request----------##########
const approveMasterProductDeleteRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { requestId } = req.body;

  const associate = await prisma.associate.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!associate) {
    return res.respond(403, "associate not found!");
  }

  const request = await prisma.masterProductDeleteRequest.findUnique({
    where: { id: requestId },
    include: { masterProduct: true },
  });

  if (!request || request.status !== 'PENDING') {
    return res.status(404).json({ message: 'Valid pending delete request not found' });
  }

  await prisma.$transaction([
    prisma.masterProduct.update({
      where: { id: request.masterProductId },
      data: { isDeleted: true },
    }),
    prisma.masterProductDeleteRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
      },
    }),
  ]);

  return res.respond(200, "MasterProduct deleted (soft) successfully!");
});

// ##########----------Reject Master Product Delete Request----------##########
const rejectMasterProductDeleteRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { requestId } = req.body;

  const associate = await prisma.associate.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!associate) {
    return res.respond(403, "associate not found!");
  }

  const request = await prisma.masterProductDeleteRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || request.status !== 'PENDING') {
    return res.status(404).json({ message: 'Valid pending delete request not found' });
  }

  await prisma.masterProductDeleteRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reason: reason || request.reason,
      },
    });

  return res.respond(200, "Delete request rejected successfully!");
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
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: limit,
  });

  res.respond(200, "Master Products fetched successfully!", {
    totalItems: totalCount,
    currentPage: page,
    totalPages: Math.ceil(totalCount / limit),
    pageSize: limit,
    data: masterProducts,
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

  const masterProduct = await prisma.masterProduct.findMany({
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
          emiFrequency: true,
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
          blacklistFlags: true,
          minDocumentsRequired: true,
          documentSubmissionModes: true,
          documentVerificationModes: true,
          employmentTypesAllowed: true,
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
          customBureauFlags: true,
          scoreDecayTolerance: true,
        },
      },
      financialStatements: {
        select: {
          id: true,
          minMonthlyCredit: true,
          minAverageBalance: true,
          bouncesLast3Months: true,
          netIncomeRecognition: true,
          cashDepositsCapPercent: true,
          statementSources: true,
          accountTypes: true,
          pdfParsingRequired: true,
        },
      },
      behavioralData: {
        select: {
          id: true,
          salaryRegularityThreshold: true,
          spendingConsistencyPercent: true,
          upiSpendToIncomeRatio: true,
          billPaymentHistory: true,
          digitalFootprintRequired: true,
          locationConsistencyKm: true,
          repeatBorrowerBehavior: true,
        },
      },
      riskScoring: {
        select: {
          id: true,
          internalScoreVars: true,
          externalScoreInputs: true,
          riskCategoryMapping: true,
          maxDTI: true,
          maxLTV: true,
          coBorrowerRequired: true,
        },
      },
      Collateral: {
        select: {
          id: true,
          collateralType: true,
          collateralValue: true,
          collateralValuationDate: true,
          collateralDocs: true,
          collateralOwnerName: true,
          guarantorRequired: true,
          guarantorName: true,
          guarantorRelationship: true,
          guarantorPAN: true,
          guarantorCreditBureau: true,
          guarantorCreditScore: true,
          guarantorMonthlyIncome: true,
          guarantorIncomeProofTypes: true,
          guarantorVerificationStatus: true,
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
  createFinancialTerms,
  createEligibilityCriteria,
  createCreditBureauConfig,
  createFinancialStatements,
  createBehavioralData,
  createRiskScoring,
  createCollateral,
  submitMasterProductUpdateRequest,
  approveMasterProductUpdateRequest,
  rejectMasterProductUpdateRequest,
  createMasterProductDeleteRequest,
  approveMasterProductDeleteRequest,
  rejectMasterProductDeleteRequest,
  getAllMasterProducts,
  getMasterProductDetails,
  getMasterProductVersions,
  getMasterProductVersionById,
};
