const { asyncHandler } = require("../../../utils/asyncHandler");
const { PrismaClient } = require("@prisma/client");
const { generateProductCode } = require("../../../utils/uniqueCodeGenerator");

const prisma = new PrismaClient();

// ##########----------Create Master Product----------##########
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
        versionId: "1",
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

// ##########----------Master Product Update Request----------##########
const submitMasterProductUpdateRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    masterProductId,
    updateReason,
    loanStructure,
    feeStructure,
    compliance,
    disbursement,
    performance,
    purposes,
    commonUseCases,
    customerTypes,
  } = req.body;

  if (!masterProductId || !updateReason || !proposedVersion) {
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

  const proposedVersion = masterProduct.versionId + 1;

  const updateRequest = await prisma.masterProductUpdateRequest.create({
    data: {
      masterProductId,
      reason: updateReason,
      proposedVersion,
      status: "PENDING",
      loanStructure: loanStructure ? { create: loanStructure } : undefined,
      feeStructure: feeStructure ? { create: feeStructure } : undefined,
      securityCompliance: compliance ? { create: compliance } : undefined,
      disbursementRule: disbursement ? { create: disbursement } : undefined,
      performance: performance ? { create: performance } : undefined,
      purposes: purposes?.length
        ? {
            create: purposes.map((id) => ({
              productPurpose: { connect: { id } },
            })),
          }
        : undefined,
      useCases: commonUseCases?.length
        ? {
            create: commonUseCases.map((id) => ({
              commonUseCase: { connect: { id } },
            })),
          }
        : undefined,
      customerTypes: customerTypes?.length
        ? {
            create: customerTypes.map((id) => ({
              customerType: { connect: { id } },
            })),
          }
        : undefined,
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
  const { updateRequestId } = req.params;

  const associate = await prisma.associate.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!associate) {
    return res.respond(403, "associate not found!");
  }

  const updateRequest = await prisma.masterProductUpdateRequest.findUnique({
    where: { id: updateRequestId },
    include: {
      masterProduct: true,
      loanStructure: true,
      feeStructure: true,
      securityCompliance: true,
      disbursementRule: true,
      performance: true,
      purposes: { include: { productPurpose: true } },
      useCases: { include: { commonUseCase: true } },
      customerTypes: { include: { customerType: true } },
    },
  });

  if (!updateRequest) {
    return res.respond(404, "Update request not found.");
  }

  const { masterProduct } = updateRequest;

  await prisma.$transaction(async (tx) => {
    await tx.masterProduct.update({
      where: { id: masterProduct.id },
      data: {
        version: masterProduct.version + 1,
        MasterProductLoanStructure: {
          updateMany: {
            where: { masterProductId: masterProduct.id },
            data: updateRequest.loanStructure || {},
          },
        },
        MasterProductFeeStructure: {
          updateMany: {
            where: { masterProductId: masterProduct.id },
            data: updateRequest.feeStructure || {},
          },
        },
        MasterProductSecurityCompliance: {
          updateMany: {
            where: { masterProductId: masterProduct.id },
            data: updateRequest.securityCompliance || {},
          },
        },
        MasterProductDisbursementRules: {
          updateMany: {
            where: { masterProductId: masterProduct.id },
            data: updateRequest.disbursementRule || {},
          },
        },
        MasterProductPerformance: {
          updateMany: {
            where: { masterProductId: masterProduct.id },
            data: updateRequest.performance || {},
          },
        },
        MasterProductPurpose: {
          deleteMany: { masterProductId: masterProduct.id },
          create: updateRequest.purposes.map((p) => ({
            productPurpose: { connect: { id: p.productPurpose.id } },
          })),
        },
        MasterProductCommonUseCase: {
          deleteMany: { masterProductId: masterProduct.id },
          create: updateRequest.useCases.map((u) => ({
            commonuseCase: { connect: { id: u.commonUseCase.id } },
          })),
        },
        MasterProductCustomerType: {
          deleteMany: { masterProductId: masterProduct.id },
          create: updateRequest.customerTypes.map((c) => ({
            customerType: { connect: { id: c.customerType.id } },
          })),
        },
      },
    });

    await tx.masterProductUpdateRequest.update({
      where: { id: updateRequest.id },
      data: { status: "APPROVED", updatedAt: new Date() },
    });
  });

  return res.respond(200, "Update request approved and applied.");
});

// ##########----------Reject Master Product Update Request----------##########
const rejectMasterProductUpdateRequest = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { updateRequestId } = req.params;
  const { rejectionReason } = req.body;

  const associate = await prisma.associate.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!associate) {
    return res.respond(403, "associate not found!");
  }

  const updateRequest = await prisma.masterProductUpdateRequest.findUnique({
    where: { id: updateRequestId },
  });

  if (!updateRequest) {
    return res.respond(404, "Update request not found.");
  }

  await prisma.masterProductUpdateRequest.update({
    where: { id: updateRequestId },
    data: {
      status: "REJECTED",
      reason: rejectionReason,
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

module.exports = {
  createMasterProduct,
  submitMasterProductUpdateRequest,
  approveMasterProductUpdateRequest,
  rejectMasterProductUpdateRequest,
  getAllMasterProducts,
  getMasterProductDetails,
};
