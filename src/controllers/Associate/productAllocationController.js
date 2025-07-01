const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Allocate Product To Employer----------##########
const allocateProductToEmployer = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    employerId,
    contractTypeId,
    contractCombinationId,
    ruleBookId,
    productVariantId,
  } = req.body;

  if (
    !employerId ||
    !ruleBookId ||
    !contractTypeId ||
    !contractCombinationId ||
    !productVariantId
  ) {
    return res.respond(400, "All fields are required!");
  }

  const ERM = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
  });
  if (!ERM) {
    return res.respond(403, "Associate Subadmin not found!");
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

  const contractTypeExists = await prisma.employerContractType.findFirst({
    where: { id: contractTypeId },
  });
  if (!contractTypeExists) {
    return res.respond(404, "Contract Type not found!");
  }

  const contractCombinationExists = await prisma.employerContractTypeCombination.findFirst({
    where: { id: contractCombinationId },
  });
  if (!contractCombinationExists) {
    return res.respond(404, "Contract Combination not found!");
  }

  const allocatedProduct = await prisma.allocateProductToEmployer.create({
    data: {
      emplyerManagerId: ERM.id,
      employerId,
      contractTypeId,
      contractCombinationId,
      ruleBookId,
      productVariantId,
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
  });
  if (!ERM) {
    return res.respond(403, "Associate Subadmin not found!");
  }

  const allocatedProducts = await prisma.allocateProductToEmployer.findMany({
    where: {
      isDeleted: false,
    },
    include: {
      employer: {
        select: {
          id: true,
          name: true,
        },
      },
      contractType: {
        select: {
          id: true,
          contractType: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      },
      contractCombination: {
        select: {
          id: true,
          uniqueId: true,
          triggerNextMonth: true,
          accuralStartAt: true,
          accuralEndAt: true,
          payoutDate: true,
        },
      },
      ruleBook: {
        select: {
          id: true,
          workingPeriod: true,
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
