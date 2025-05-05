const { asyncHandler } = require("../../../utils/asyncHandler");
const { PrismaClient } = require("@prisma/client");
const { generateProductCode } = require("../../../utils/uniqueCodeGenerator");

const prisma = new PrismaClient();

const createMasterProduct = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    productCategoryId,
    productType,
    productName,
    productDescription,
    loanStructure,
    feeStructure,
    securityCompliance,
    disbursementRules,
    performance,
    purposeIds = [],
    commonUseCaseIds = [],
    customerTypeIds = [],
  } = req.body;

  if (
    !productName ||
    !productCategoryId ||
    !productType ||
    !loanStructure ||
    !feeStructure ||
    !securityCompliance ||
    !disbursementRules ||
    !performance ||
    purposeIds.length === 0 ||
    commonUseCaseIds.length === 0 ||
    customerTypeIds.length === 0
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
    where: { productCode: generatedCode },
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
        productManagerId: productManager.id,
        productCategoryId,
        productType,
        productName,
        productCode: generatedCode,
        productDescription,

        MasterProductLoanStructure: {
          create: loanStructure,
        },
        MasterProductFeeStructure: {
          create: feeStructure,
        },
        MasterProductSecurityCompliance: {
          create: securityCompliance,
        },
        MasterProductDisbursementRules: {
          create: disbursementRules,
        },
        MasterProductPerformance: {
          create: performance,
        },
        MasterProductPurpose: {
          create: purposeIds.map((id) => ({
            productPurpose: { connect: { id } },
          })),
        },
        MasterProductCommonUseCase: {
          create: commonUseCaseIds.map((id) => ({
            commonuseCase: { connect: { id } },
          })),
        },
        MasterProductCustomerType: {
          create: customerTypeIds.map((id) => ({
            customerType: { connect: { id } },
          })),
        },
      },
    });

    return product;
  });

  return res.respond(201, "Master Product Created Successfully!", result);
});

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

module.exports = {
  createMasterProduct,
  getAllMasterProducts,
  getMasterProductDetails,
};
