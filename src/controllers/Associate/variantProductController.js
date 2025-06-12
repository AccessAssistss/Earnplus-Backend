const { asyncHandler } = require("../../../utils/asyncHandler");
const { PrismaClient } = require("@prisma/client");
const {
  generateVariantProductCode,
} = require("../../../utils/uniqueCodeGenerator");

const prisma = new PrismaClient();

// ##########----------Create Variant Product----------##########
const createVariantProduct = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    masterProductId,
    variantName,
    variantType,
    variantCode,
    remark,
    productType,
    partnerId
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

  const masterProduct = await prisma.masterProduct.findFirst({
    where: { id: masterProductId, isDeleted: false },
    select: { id: true, productCode: true },
  });

  if (!masterProduct) {
    return res.respond(404, "Master Product not found.");
  }

  const variantCount = await prisma.variantProduct.count({
    where: {
      masterProductId,
      isDeleted: false,
    },
  });

  const generatedCode = generateVariantProductCode(
    masterProduct.productCode,
    variantName,
    variantCount
  );

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.variantProduct.create({
      data: {
        masterProductId,
        productManagerId: productManager.id,
        variantName,
        variantType,
        variantCode,
        variantId: generatedCode,
        remark,
        productType,
        partnerId,
      },
    });

    return product;
  });

  return res.respond(
    201,
    "Variant Product created successfully!",
    result
  );
});

// ##########----------Create Variant Product Parameter----------##########
const createVariantProductParameter = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    variantProductId,
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
    penalInterestApplicable,
    emiFrequency,
    prepaymentFeeType,
    prepaymentFeeValue,
    penalInterestRate,
    minAge,
    maxAge,
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

  const exists = await prisma.variantProduct.findUnique({
    where: { id: variantProductId },
  });

  if (!exists) {
    return res.respond(404, "Variant Product not found.");
  }

  const parameter = await prisma.variantProductParameter.create({
    data: {
      variantProductId,
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
      penalInterestApplicable,
      emiFrequency,
      prepaymentFeeType,
      prepaymentFeeValue,
      penalInterestRate,
      minAge,
      maxAge,
    },
  });

  return res.respond(201, "Variant Product Parameters created!", parameter);
});

// ##########----------Create Variant Product Other Charges----------##########
const createVariantProductOtherCharges = asyncHandler(async (req, res) => {
  const userId = req.user;

  const {
    variantProductId,
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

  const exists = await prisma.variantProduct.findUnique({
    where: { id: variantProductId },
  });

  if (!exists) {
    return res.respond(404, "Variant Product not found.");
  }

  const charges = await prisma.variantProductOtherCharges.create({
    data: {
      variantProductId,
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

// ##########----------Create Variant Product Repayment----------##########
const createVariantProductRepayment = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    variantProductId,
    incentiveType,
    incentiveValue,
    payoutMode,
    incentiveReversalConditions,
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

  const exists = await prisma.variantProduct.findUnique({
    where: { id: variantProductId },
  });

  if (!exists) {
    return res.respond(404, "Variant Product not found.");
  }

  const repayment = await prisma.variantProductRepayment.create({
    data: {
      variantProductId,
      incentiveType,
      incentiveValue,
      payoutMode,
      incentiveReversalConditions,
    },
  });

  return res.respond(201, "Repayment details created!", repayment);
});

// ##########----------Submit Variant Product Update Request----------##########
const submitVariantProductUpdateRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    variantProductId,
    updateType,
    coreUpdate,
    eligibilityUpdate,
    feeUpdate,
    withdrawLogicUpdate,
    repaymentUpdate,
    validityUpdate,
  } = req.body;

  if (!variantProductId) {
    return res.respond(400, "Required fields missing.");
  }

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(
      403,
      "Only Product Managers can submit update requests."
    );
  }

  const variantProduct = await prisma.variantProduct.findUnique({
    where: { id: variantProductId },
  });

  if (!variantProduct) {
    return res.respond(404, "Variant Product not found.");
  }

  const updateRequest = await prisma.variantProductUpdateRequest.create({
    data: {
      variantProductId,
      updateType,
      status: "pending",
      coreUpdate: coreUpdate
        ? {
          create: coreUpdate,
        }
        : undefined,
      eligibilityUpdate: eligibilityUpdate
        ? {
          create: eligibilityUpdate,
        }
        : undefined,
      feeUpdate: feeUpdate
        ? {
          create: feeUpdate,
        }
        : undefined,
      withdrawLogicUpdate: withdrawLogicUpdate
        ? {
          create: withdrawLogicUpdate,
        }
        : undefined,
      repaymentUpdate: repaymentUpdate
        ? {
          create: repaymentUpdate,
        }
        : undefined,
      validityUpdate: validityUpdate
        ? {
          create: validityUpdate,
        }
        : undefined,
    },
    include: {
      coreUpdate: true,
      eligibilityUpdate: true,
      feeUpdate: true,
      withdrawLogicUpdate: true,
      repaymentUpdate: true,
      validityUpdate: true,
    },
  });

  return res.respond(
    201,
    "Variant Product Update Request Submitted!",
    updateRequest
  );
});

// ##########----------Approve Variant Product Update Request----------##########
const approveVariantProductUpdateRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { requestId } = req.params;

  const associate = await prisma.associate.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!associate) {
    return res.respond(403, "Associate not found.");
  }

  const request = await prisma.variantProductUpdateRequest.findUnique({
    where: { id: requestId },
    include: {
      variantProduct: {
        include: {
          VariantProductEligibility: true,
          VariantProductFeeStructure: true,
          VariantProductWithdrawLogic: true,
          VariantProductRepayment: true,
          VariantProductValidity: true,
        },
      },
      coreUpdate: true,
      eligibilityUpdate: true,
      feeUpdate: true,
      withdrawLogicUpdate: true,
      repaymentUpdate: true,
      validityUpdate: true,
    },
  });

  if (!request || request.isDeleted) {
    return res.respond(404, "Update request not found!");
  }

  const { variantProduct } = request;
  const newVersionId = variantProduct.versionId + 1;

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
    await tx.variantProductVersion.create({
      data: {
        variantProductId: variantProduct.id,
        versionId: newVersionId,
        snapshot: JSON.parse(JSON.stringify(variantProduct)),
      },
    });

    await tx.variantProduct.update({
      where: { id: variantProduct.id },
      data: {
        variantName: request.coreUpdate.variantName,
        variantType: request.coreUpdate.variantType,
        variantCode: request.coreUpdate.variantCode,
        remark: request.coreUpdate.remark,
        productType: request.coreUpdate.productType,
        versionId: newVersionId,
      },
    });

    await tx.variantProductEligibility.update({
      where: { varientProductId: variantProduct.id },
      data: cleanPrismaUpdateData(request.eligibilityUpdate),
    });

    await tx.variantProductFeeStructure.update({
      where: { variantProductId: variantProduct.id },
      data: cleanPrismaUpdateData(request.feeUpdate),
    });

    await tx.variantProductWithdrawLogic.update({
      where: { variantProductId: variantProduct.id },
      data: cleanPrismaUpdateData(request.withdrawLogicUpdate),
    });

    await tx.variantProductRepayment.update({
      where: { variantProductId: variantProduct.id },
      data: cleanPrismaUpdateData(request.repaymentUpdate),
    });

    await tx.variantProductValidity.update({
      where: { variantProductId: variantProduct.id },
      data: cleanPrismaUpdateData(request.validityUpdate),
    });

    await tx.variantProductUpdateRequest.update({
      where: { id: requestId },
      data: {
        isApproved: true,
        isRejected: true,
      },
    });
  });
  return res.respond(200, "Variant Product Update Request Approved!");
});

// ##########----------Reject Variant Product Update Request----------##########
const rejectVariantProductUpdateRequest = asyncHandler(async (req, res) => {
  const { requestId, reason } = req.body;

  const updateRequest = await prisma.variantProductUpdateRequest.findUnique({
    where: { id: requestId },
  });

  if (!updateRequest) {
    return res.respond(404, "Update Request not found!");
  }

  await prisma.variantProductUpdateRequest.update({
    where: { id: requestId },
    data: {
      isRejected: true,
      status: "rejected",
      rejectionReason: reason,
    },
  });

  res.respond(200, "Variant Product Update Request Rejected!");
});

// ##########----------Get All Variant Products By Product----------##########
const getAllVariantProductsByProduct = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { productId } = req.params;

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can access this data.");
  }

  const variants = await prisma.variantProduct.findMany({
    where: {
      masterProductId: productId,
      isDeleted: false,
    },
    select: {
      id: true,
      variantName: true,
      variantType: true,
      variantCode: true,
      productType: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.respond(200, "Variant products fetched successfully.", variants);
});

// ##########----------Get Variant Product Details----------##########
const getVariantProductDetail = asyncHandler(async (req, res) => {
  const { variantProductId } = req.params;

  const variant = await prisma.variantProduct.findFirst({
    where: {
      id: variantProductId,
      isDeleted: false,
    },
    include: {
      masterProduct: true,
      productManager: { select: { id: true, userId: true } },

      VariantProductParameter: true,
      VariantProductOtherCharges: true,
      VariantProductRepayment: true,
    },
  });

  if (!variant) {
    return res.respond(404, "Variant product not found.");
  }

  return res.respond(
    200,
    "Variant product details fetched successfully!",
    variant
  );
});

// ##########----------Assign Variant product to Employer----------##########
const assignVariantProductToEmployer = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    employerId,
    variantProductId,
    assignmentDate,
    endDate,
    employerNote,
  } = req.body;

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });
  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can access this data.");
  }

  const variantProduct = await prisma.variantProduct.findFirst({
    where: { id: variantProductId, isDeleted: false },
  });
  if (!variantProduct) {
    return res.respond(404, "Variant product not found.");
  }

  const employer = await prisma.employer.findFirst({
    where: { id: employerId, isDeleted: false },
  });
  if (!employer) {
    return res.respond(404, "Employer not found.");
  }

  const alreadyAssigned = await prisma.assignVariantProductToEmployer.findFirst(
    {
      where: {
        variantProductId,
        employerId,
      },
    }
  );
  if (alreadyAssigned) {
    return res.respond(
      409,
      `Variant product is already assigned to employer "${employer.employerName}" (ID: ${employer.employerId}).`
    );
  }

  const assignment = await prisma.assignVariantProductToEmployer.create({
    data: {
      variantProductId,
      employerId,
      aasignmentDate: new Date(assignmentDate),
      endDate: new Date(endDate),
      employerNote: employerNote || "",
    },
  });

  return res.respond(
    201,
    "Variant product assigned to employer successfully!",
    assignment
  );
});

// ##########----------Get Assigned Variant Products to Employer----------##########
const getAssignedVariantProducts = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { employerId } = req.params;

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });
  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can access this data.");
  }

  const employer = await prisma.employer.findFirst({
    where: { id: employerId, isDeleted: false },
  });
  if (!employer) {
    return res.respond(404, "Employer not found.");
  }

  const assignments = await prisma.assignVariantProductToEmployer.findMany({
    include: {
      employer: {
        select: {
          id: true,
          employerId: true,
          name: true,
        },
      },
    },
    orderBy: { aasignmentDate: "desc" },
  });

  return res.respond(
    200,
    "Assigned variant products fetched successfully!",
    assignments
  );
});

// ##########----------Variant product Versions----------##########
const getVariantProductVersions = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { variantProductId } = req.params;

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });
  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can access this data.");
  }

  const variantProduct = await prisma.variantProduct.findFirst({
    where: { id: variantProductId, isDeleted: false },
  });
  if (!variantProduct) {
    return res.respond(404, "Variant product not found.");
  }

  const versions = await prisma.variantProductVersion.findMany({
    where: { variantProductId },
    orderBy: { versionId: "desc" },
  });

  return res.respond(
    201,
    "Variant product version history fetched successfully!",
    versions
  );
});

// ##########----------Variant product Version Detail----------##########
const getVariantProductVersionById = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { versionId } = req.params;

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });

  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can access this data.");
  }

  const version = await prisma.variantProductVersion.findUnique({
    where: { id: versionId },
  });

  if (!version) {
    return res.respond(404, "Variant product version not found.");
  }

  return res.respond(
    200,
    "Variant product version details fetched successfully!",
    version
  );
});

module.exports = {
  createVariantProduct,
  createVariantProductParameter,
  createVariantProductOtherCharges,
  createVariantProductRepayment,
  submitVariantProductUpdateRequest,
  approveVariantProductUpdateRequest,
  rejectVariantProductUpdateRequest,
  getAllVariantProductsByProduct,
  getVariantProductDetail,
  assignVariantProductToEmployer,
  getAssignedVariantProducts,
  getVariantProductVersions,
  getVariantProductVersionById,
};
