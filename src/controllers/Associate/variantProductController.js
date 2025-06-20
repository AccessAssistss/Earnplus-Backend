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
        versionId: 1,
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
    penalInterestApplicable,
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

  const existingRepayment = await prisma.variantProductRepayment.findUnique({
    where: { variantProductId },
  });

  if (existingRepayment) {
    return res.respond(400, "Repayment already exists for this variant product.");
  }

  const repayment = await prisma.variantProductRepayment.create({
    data: {
      variantProductId,
      penalInterestApplicable,
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
    productType,
    variantName,
    variantType,
    partnerId,
    remark,
    parameterUpdate,
    otherChargesUpdate,
    repaymentUpdate,
  } = req.body;

  if (!variantProductId) {
    return res.respond(400, "Required field missing.");
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
      productManagerId: productManager.id,
      productType,
      variantName,
      variantType,
      partnerId,
      remark,

      VariantProductParameterUpdate: parameterUpdate
        ? {
          create: parameterUpdate,
        }
        : undefined,

      VariantProductOtherChargesUpdate: otherChargesUpdate
        ? {
          create: otherChargesUpdate,
        }
        : undefined,

      VariantProductRepaymentUpdate: repaymentUpdate
        ? {
          create: repaymentUpdate,
        }
        : undefined,
    },
    include: {
      VariantProductParameterUpdate: true,
      VariantProductOtherChargesUpdate: true,
      VariantProductRepaymentUpdate: true,
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
      variantProduct: true,
      VariantProductParameterUpdate: true,
      VariantProductOtherChargesUpdate: true,
      VariantProductRepaymentUpdate: true,
    },
  });

  if (!request || request.isDeleted) {
    return res.respond(404, "Update request not found!");
  }

  const { variantProduct } = request;
  const newVersionId = variantProduct.versionId + 1;

  function cleanPrismaUpdateData(data, disallowedFields = ["id", "updateRequestId", "createdAt", "updatedAt", "isDeleted"]) {
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
        variantName: request.variantName,
        variantType: request.variantType,
        productType: request.productType,
        partnerId: request.partnerId,
        remark: request.remark,
        versionId: newVersionId,
      },
    });

    if (request.VariantProductParameterUpdate) {
      await tx.variantProductParameter.update({
        where: { variantProductId: variantProduct.id },
        data: cleanPrismaUpdateData(request.VariantProductParameterUpdate),
      });
    }

    if (request.VariantProductOtherChargesUpdate) {
      await tx.variantProductOtherCharges.update({
        where: { variantProductId: variantProduct.id },
        data: cleanPrismaUpdateData(request.VariantProductOtherChargesUpdate),
      });
    }

    if (request.VariantProductRepaymentUpdate) {
      await tx.variantProductRepayment.update({
        where: { variantProductId: variantProduct.id },
        data: cleanPrismaUpdateData(request.VariantProductRepaymentUpdate),
      });
    }

    await tx.variantProductUpdateRequest.update({
      where: { id: requestId },
      data: {
        isDeleted: true,
        isApproved: true,
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
      rejectionReason: reason,
    },
  });

  res.respond(200, "Variant Product Update Request Rejected!");
});

// ##########----------Create Variant Product Delete Request----------##########
const createVariantProductDeleteRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { variantProductId, reason } = req.body;

  const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!associateSubAdmin) {
    return res.respond(403, "associate subadmin not found!");
  }

  const product = await prisma.variantProduct.findFirst({
    where: {
      id: variantProductId,
      isDeleted: false,
    },
  });

  if (!product) {
    return res.respond(404, "Variant Product not found or already deleted!");
  }

  const existingRequest = await prisma.variantProductDeleteRequest.findFirst({
    where: {
      variantProductId,
      status: 'PENDING',
    },
  });

  if (existingRequest) {
    return res.respond(400, "A delete request is already pending for this product!");
  }

  const deleteRequest = await prisma.variantProductDeleteRequest.create({
    data: {
      variantProductId,
      reason,
      requestedById: associateSubAdmin.id,
    },
  });

  return res.respond(200, "Delete request submitted successfully!", deleteRequest);
});

// ##########----------Approve Variant Product Delete Request----------##########
const approveVariantProductDeleteRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { requestId } = req.body;

  const associate = await prisma.associate.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!associate) {
    return res.respond(403, "associate not found!");
  }

  const request = await prisma.variantProductDeleteRequest.findUnique({
    where: { id: requestId },
    include: { variantProduct: true },
  });

  if (!request || request.status !== 'PENDING') {
    return res.status(404).json({ message: 'Valid pending delete request not found' });
  }

  await prisma.$transaction([
    prisma.variantProduct.update({
      where: { id: request.variantProductId },
      data: { isDeleted: true },
    }),
    prisma.variantProductDeleteRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
      },
    }),
  ]);

  return res.respond(200, "Variant Product deleted (soft) successfully!");
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
      versionId: true,
      partnerId: true,
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
      variantProduct: {
        select: {
          id: true,
          variantName: true,
        },
      },
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

// ##########----------Get Assigned Employer By Varient----------##########
const getAssignedEmployers = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { variantId } = req.params;

  const productManager = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });
  if (!productManager || productManager.role.roleName !== "Product Manager") {
    return res.respond(403, "Only Product Managers can access this data.");
  }

  const assignments = await prisma.assignVariantProductToEmployer.findMany({
    where: {
      variantProductId: variantId
    },
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
  createVariantProductDeleteRequest,
  approveVariantProductDeleteRequest,
  getAllVariantProductsByProduct,
  getVariantProductDetail,
  assignVariantProductToEmployer,
  getAssignedVariantProducts,
  getAssignedEmployers,
  getVariantProductVersions,
  getVariantProductVersionById,
};
