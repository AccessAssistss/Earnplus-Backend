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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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

  const existingCode = await prisma.variantProduct.findFirst({
    where: { variantId: generatedCode },
  });
  if (existingCode) {
    return res.respond(
      409,
      "Generated product code already exists. Try a different name."
    );
  }

  const latestVersion = await prisma.variantProductVersion.findFirst({
    where: { variantProduct: { variantName: { equals: variantName, mode: "insensitive" } } },
    orderBy: { versionId: 'desc' },
  });

  const newVersionId = latestVersion ? latestVersion.versionId + 1 : 1;

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.variantProduct.create({
      data: {
        masterProductId,
        productManagerId: productManager.id,
        variantName,
        versionId: newVersionId,
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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

  const existingParameter = await prisma.variantProductParameter.findUnique({
    where: { variantProductId },
  });
  if (existingParameter) {
    return res.respond(409, "Product Parameters already exist for this Variant Product.");
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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

  const existingOtherCharges = await prisma.variantProductOtherCharges.findUnique({
    where: { variantProductId },
  });
  if (existingOtherCharges) {
    return res.respond(409, "Other Charges already exist for this Variant Product.");
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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
      variantId: true,
      variantCode: true,
      productType: true,
      versionId: true,
      partnerId: true,
      createdAt: true,
      updatedAt: true,
      productManager: {
        select: {
          id: true,
          name: true,
        }
      }
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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

// ####################--------------------Variant Product Assigning To Employer--------------------####################
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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
  });
  if (!productManager) {
    return res.respond(403, "Associate Subadmin not found.");
  }

  const employer = await prisma.employer.findFirst({
    where: { id: employerId, isDeleted: false },
  });
  if (!employer) {
    return res.respond(404, "Employer not found.");
  }

  const assignments = await prisma.assignVariantProductToEmployer.findMany({
    where: { isDeleted: false },
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
    orderBy: { assignmentDate: "desc" },
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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

// ####################--------------------Variant Product Version Handeling--------------------####################
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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
    200,
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
  if (!productManager || productManager.role.roleName !== "Product_Manager") {
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
  getAllVariantProductsByProduct,
  getVariantProductDetail,
  assignVariantProductToEmployer,
  getAssignedVariantProducts,
  getAssignedEmployers,
  getVariantProductVersions,
  getVariantProductVersionById,
};
