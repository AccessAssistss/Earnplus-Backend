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
    remark,
    productType,

    eligibility,
    feeStructure,
    withdrawLogic,
    repayment,
    validity,
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

  const variantCode = generateVariantProductCode(
    masterProduct.productCode,
    variantName,
    variantCount
  );

  const createdVariant = await prisma.variantProduct.create({
    data: {
      masterProductId,
      productManagerId: productManager.id,
      variantName,
      variantType,
      variantCode,
      remark,
      productType,

      VariantProductEligibility: {
        create: {
          minEmploymentDays: eligibility.minEmploymentDays,
          disbursementMode: eligibility.disbursementMode,
          minSalary: eligibility.minSalary,
          maxSalary: eligibility.maxSalary,
          paymentFrequency: eligibility.paymentFrequency,
        },
      },

      VariantProductFeeStructure: {
        create: {
          setupFee: feeStructure.setupFee,
          perTransactionFee: feeStructure.perTransactionFee,
          subscriptionOption: feeStructure.subscriptionOption,
          feePayer: feeStructure.feePayer,
          gst: feeStructure.gst,
          penalty: feeStructure.penalty,
          insuranceFee: feeStructure.insuranceFee,
          insuranceCalcOn: feeStructure.insuranceCalcOn,
        },
      },

      VariantProductWithdrawLogic: {
        create: {
          minWithdrawAmount: withdrawLogic.minWithdrawAmount,
          maxWithdrawAmount: withdrawLogic.maxWithdrawAmount,
          minAccrued: withdrawLogic.minAccrued,
          maxAccrued: withdrawLogic.maxAccrued,
          maxWithdrawlPerMonth: withdrawLogic.maxWithdrawlPerMonth,
          frequencyRule: withdrawLogic.frequencyRule,
        },
      },

      VariantProductRepayment: {
        create: {
          repaymentMode: repayment.repaymentMode,
          eNachRequired: repayment.eNachRequired,
          autoDebit: repayment.autoDebit,
        },
      },

      VariantProductValidity: {
        create: {
          activationDate: validity.activationDate,
          validityPeriod: validity.validityPeriod,
          workLocation: validity.workLocation,
          minSalary: validity.minSalary,
          maxSalary: validity.maxSalary,
        },
      },
    },
    include: {
      VariantProductEligibility: true,
      VariantProductFeeStructure: true,
      VariantProductWithdrawLogic: true,
      VariantProductRepayment: true,
      VariantProductValidity: true,
    },
  });

  return res.respond(
    201,
    "Variant Product created successfully!",
    createdVariant
  );
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

      VariantProductEligibility: true,
      VariantProductFeeStructure: true,
      VariantProductWithdrawLogic: true,
      VariantProductRepayment: true,
      VariantProductValidity: true,
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

module.exports = {
  createVariantProduct,
  getAllVariantProductsByProduct,
  getVariantProductDetail,
};
