const { asyncHandler } = require("../../../utils/asyncHandler");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ##########----------Get Master Products For Customer----------##########
const getMasterProductsForCustomer = asyncHandler(async (req, res) => {
  const userId = req.user;

  const customer = await prisma.employee.findFirst({
    where: { userId, isDeleted: false },
  });
  if (!customer) {
    return res.respond(404, "Customer not found.");
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

// ##########----------Get Master Product Details For Customer----------##########
const getMasterProductDetailsForCustomer = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { productId } = req.params;

  const customer = await prisma.employee.findFirst({
    where: { userId, isDeleted: false },
  });
  if (!customer) {
    return res.respond(404, "Customer not found.");
  }

  const exists = await prisma.masterProduct.findUnique({
    where: { id: productId },
  });
  if (!exists) {
    return res.respond(404, "Master Product not found.");
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
      createdAt: true,
      updatedAt: true,

      financialTerms: {
        select: {
          id: true,
          minLoanAmount: true,
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
        },
      },
      eligibilityCriteria: {
        select: {
          id: true,
          minAge: true,
          maxAge: true,
          minMonthlyIncome: true,
          minBureauScore: true,
          coApplicantRequired: true,
          collateralRequired: true,
        },
      },
      MasterProductFields: {
        select: {
          id: true,
          fieldsJsonData: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.respond(200, "Master Product Details fetched successfully!", masterProduct);
});

// ##########----------Get Master Product Fields----------##########
const getMasterProductFields = asyncHandler(async (req, res) => {
  const userId = req.user
  const { masterProductId } = req.params;

  if (!masterProductId) {
    return res.respond(400, "masterProductId is required!");
  }

  const customer = await prisma.employee.findFirst({
    where: { userId, isDeleted: false },
  });
  if (!customer) {
    return res.respond(404, "Customer not found.");
  }

  const exists = await prisma.masterProduct.findUnique({
    where: { id: masterProductId },
  });
  if (!exists) {
    return res.respond(404, "Master Product not found.");
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
      createdAt: true,
      updatedAt: true,

      MasterProductFields: {
        select: {
          id: true,
          fieldsJsonData: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return res.respond(200, "Master Product Fields fetched successfully!", masterProduct);
});

module.exports = {
  getMasterProductsForCustomer,
  getMasterProductDetailsForCustomer,
  getMasterProductFields,
};
