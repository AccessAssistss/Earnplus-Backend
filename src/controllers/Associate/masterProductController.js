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
        productManagerId: productManager.id,
        masterProductId,
        productCategoryId,
        productName,
        productDescription,
        loanTypeId,
        deliveryChannel,
        partnerId,

        financialTermsUpdate: financialTermsUpdate
          ? {
            create: {
              ...financialTermsUpdate,
              FinancialDisbursementModeUpdate: {
                createMany: {
                  data: financialTermsUpdate.disbursementModeIds.map((disbursementId) => ({ disbursementId }))
                }
              },
              FinancialRepaymentModeUpdate: {
                createMany: {
                  data: financialTermsUpdate.repaymentModeIds.map((repaymentId) => ({ repaymentId }))
                }
              }
            }
          }
          : undefined,

        eligibilityCriteriaUpdate: eligibilityCriteriaUpdate
          ? {
            create: {
              ...eligibilityCriteriaUpdate,
              minDocumentsRequired: {
                createMany: {
                  data: eligibilityCriteriaUpdate.documentIds.map((documentId) => ({ documentId }))
                }
              },
              employmentTypesAllowed: {
                createMany: {
                  data: eligibilityCriteriaUpdate.employmentIds.map((employmentId) => ({ employmentId }))
                }
              }
            }
          }
          : undefined,

        creditBureauConfigUpdate: creditBureauConfigUpdate
          ? { create: creditBureauConfigUpdate }
          : undefined,

        financialStatementsUpdate: financialStatementsUpdate
          ? { create: financialStatementsUpdate }
          : undefined,

        behavioralDataUpdate: behavioralDataUpdate
          ? { create: behavioralDataUpdate }
          : undefined,

        riskScoringUpdate: riskScoringUpdate
          ? {
            create: {
              ...riskScoringUpdate,
              internalScoreVars: {
                createMany: {
                  data: riskScoringUpdate.scoreVariableIds.map((scoreId) => ({ scoreId }))
                }
              },
              externalScoreInputs: {
                createMany: {
                  data: riskScoringUpdate.externalScoreIds.map((externalId) => ({ externalId }))
                }
              }
            }
          }
          : undefined,

        CollateralUpdate: collateralUpdate
          ? {
            create: {
              ...collateralUpdate,
              collateralDocs: {
                createMany: {
                  data: collateralUpdate.documentIds.map((docId) => ({ docId }))
                }
              }
            }
          }
          : undefined,

        MasterProductPurposeUpdate: purposeIds
          ? {
            createMany: {
              data: purposeIds.map((purposeId) => ({ purposeId }))
            }
          }
          : undefined,

        MasterProductSegmentUpdate: segmentIds
          ? {
            createMany: {
              data: segmentIds.map((segmentId) => ({ segmentId }))
            }
          }
          : undefined
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
    return res.respond(403, "associate not found!");
  }

  const request = await prisma.masterProductUpdateRequest.findUnique({
    where: { id: requestId },
    include: {
      masterProduct: true,
      financialTermsUpdate: {
        include: {
          FinancialDisbursementModeUpdate: true,
          FinancialRepaymentModeUpdate: true,
        },
      },
      eligibilityCriteriaUpdate: {
        include: {
          minDocumentsRequired: true,
          employmentTypesAllowed: true,
        },
      },
      creditBureauConfigUpdate: true,
      financialStatementsUpdate: true,
      behavioralDataUpdate: true,
      riskScoringUpdate: true,
      CollateralUpdate: true,
      MasterProductPurposeUpdate: true,
      MasterProductSegmentUpdate: true,
    },
  });

  if (!request) {
    return res.respond(404, "Update request not found.");
  }

  const currentProduct = request.masterProduct;
  const newVersionId = currentProduct.versionId + 1;

  function cleanUpdateData(data, disallowedFields = ["id", "updateRequestId", "createdAt", "updatedAt"]) {
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
        productName: request.productName,
        productDescription: request.productDescription,
        productCategoryId: request.productCategoryId,
        versionId: newVersionId,
      },
    });

    if (request.financialTermsUpdate) {
      await tx.masterProductFinancialTerms.update({
        where: { masterProductId: currentProduct.id },
        data: cleanUpdateData(request.financialTermsUpdate),
      });

      await tx.financialDisbursementMode.deleteMany({
        where: { financialTermsId: request.financialTermsUpdate.id },
      });
      await tx.financialDisbursementMode.createMany({
        data: request.financialTermsUpdate.FinancialDisbursementModeUpdate.map((f) => ({
          financialTermsId: request.financialTermsUpdate.id,
          disbursementId: f.disbursementId,
        })),
      });

      await tx.financialRepaymentMode.deleteMany({
        where: { financialTermsId: request.financialTermsUpdate.id },
      });
      await tx.financialRepaymentMode.createMany({
        data: request.financialTermsUpdate.FinancialRepaymentModeUpdate.map((f) => ({
          financialTermsId: request.financialTermsUpdate.id,
          repaymentId: f.repaymentId,
        })),
      });
    }

    if (request.eligibilityCriteriaUpdate) {
      await tx.masterProductEligibility.update({
        where: { masterProductId: currentProduct.id },
        data: cleanUpdateData(request.eligibilityCriteriaUpdate),
      });

      await tx.eligibilityDocument.deleteMany({
        where: { eligibilityId: request.eligibilityCriteriaUpdate.id },
      });
      await tx.eligibilityDocument.createMany({
        data: request.eligibilityCriteriaUpdate.minDocumentsRequired.map((d) => ({
          eligibilityId: request.eligibilityCriteriaUpdate.id,
          documentId: d.documentId,
        })),
      });

      await tx.eligibilityEmploymentType.deleteMany({
        where: { eligibilityId: request.eligibilityCriteriaUpdate.id },
      });
      await tx.eligibilityEmploymentType.createMany({
        data: request.eligibilityCriteriaUpdate.employmentTypesAllowed.map((e) => ({
          eligibilityId: request.eligibilityCriteriaUpdate.id,
          employmentId: e.employmentId,
        })),
      });
    }

    if (request.creditBureauConfigUpdate) {
      await tx.masterProductCreditBureau.update({
        where: { masterProductId: currentProduct.id },
        data: cleanUpdateData(request.creditBureauConfigUpdate),
      });
    }

    if (request.financialStatementsUpdate) {
      await tx.masterProductStatements.update({
        where: { masterProductId: currentProduct.id },
        data: cleanUpdateData(request.financialStatementsUpdate),
      });
    }

    if (request.behavioralDataUpdate) {
      await tx.masterProductBehavioral.update({
        where: { masterProductId: currentProduct.id },
        data: cleanUpdateData(request.behavioralDataUpdate),
      });
    }

    if (request.riskScoringUpdate) {
      await tx.masterProductRiskScore.update({
        where: { masterProductId: currentProduct.id },
        data: cleanUpdateData(request.riskScoringUpdate),
      });
    }

    if (request.CollateralUpdate) {
      await tx.masterProductCollateral.update({
        where: { masterProductId: currentProduct.id },
        data: cleanUpdateData(request.CollateralUpdate),
      });
    }

    await tx.masterProductPurpose.deleteMany({
      where: { masterProductId: currentProduct.id },
    });
    await tx.masterProductPurpose.createMany({
      data: request.MasterProductPurposeUpdate.map((p) => ({
        masterProductId: currentProduct.id,
        purposeId: p.purposeId,
      })),
    });

    await tx.masterProductSegment.deleteMany({
      where: { masterProductId: currentProduct.id },
    });
    await tx.masterProductSegment.createMany({
      data: request.MasterProductSegmentUpdate.map((s) => ({
        masterProductId: currentProduct.id,
        segmentId: s.segmentId,
      })),
    });

    await tx.masterProductUpdateRequest.update({
      where: { id: requestId },
      data: { isApproved: true, isDeleted: true },
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
  getAllMasterProducts,
  getMasterProductDetails,
  getMasterProductVersions,
  getMasterProductVersionById,
};
