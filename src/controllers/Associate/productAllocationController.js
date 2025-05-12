const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Allocate Product To Employer----------##########
const allocateProductToEmployer = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    employerId,
    ruleBookId,
    workLocationId,
    productVariantId,
    employerManagerId,
    note,
  } = req.body;

  if (!employerId || !ruleBookId || !productVariantId || !workLocationId) {
    return res.respond(
      400,
      "employerId, ruleBookId and productVariantId are required!"
    );
  }

  const ERM = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });

  if (!ERM || ERM.role.roleName !== "ERM") {
    return res.respond(403, "Only ERMs can create contract combinations!");
  }

  const employer = await prisma.employer.findFirst({
    where: { id: employerId, isDeleted: false },
  });
  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  const ruleBook = await prisma.contractCombinationRuleBook.findFirst({
    where: { id: ruleBookId },
  });
  if (!ruleBook) {
    return res.respond(404, "Rule Book not found!");
  }

  const variantExists = await prisma.variantProduct.findFirst({
    where: { id: productVariantId, isDeleted: false },
  });
  if (!variantExists) {
    return res.respond(404, "Variant Product not found!");
  }

  const workLocationExists = await prisma.employerLocationDetails.findFirst({
    where: { id: workLocationId, isDeleted: false },
  });
  if (!workLocationExists) {
    return res.respond(404, "Work Location not found!");
  }

  const allocatedProduct = await prisma.allocateProductToEmployer.create({
    data: {
      employerId,
      ruleBookId,
      emplyerManagerId: employerManagerId || ERM.id,
      productVariantId,
      workLocationId,
      note: note || null,
    },
  });

  res.respond(
    201,
    "Product Allocation successful for employer!",
    allocatedProduct
  );
});

// ##########----------Get Allocated Products To Employers----------##########
const getAllocatedProductsToEmployers = asyncHandler(async (req, res) => {
  const userId = req.user;

  const ERM = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: { role: true },
  });

  if (!ERM || ERM.role.roleName !== "ERM") {
    return res.respond(403, "Only ERMs can create contract combinations!");
  }

  const allocatedProducts = await prisma.allocateProductToEmployer.findMany({
    where: {
      isDeleted: false,
    },
    include: {
      workLocation: {
        select: {
          id: true,
          workspaceName: true,
          noOfEmployees: true,
        },
      },
      employer: {
        select: {
          id: true,
          employerName: true,
        },
      },
      ruleBook: {
        select: {
          id: true,
          name: true,
          tenureRule: true,
          salaryBand: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      productVariant: {
        select: {
          id: true,
          variantName: true,
          variantCode: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.respond(
    200,
    "Allocated Products fetched successfully!",
    allocatedProducts
  );
});

module.exports = {
  allocateProductToEmployer,
  getAllocatedProductsToEmployers,
};
