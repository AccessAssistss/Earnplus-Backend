const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Product Assignment Rule----------##########
const createAssignmentRule = asyncHandler(async (req, res) => {
  const { masterProductId, ranges } = req.body;

  if (!masterProductId || !Array.isArray(ranges) || ranges.length === 0) {
    return res.respond(400, "masterProductId and ranges[] are required!");
  }

  const product = await prisma.masterProduct.findUnique({ where: { id: masterProductId } });
  if (!product) return res.respond(404, "Master product not found!");

  for (let i = 0; i < ranges.length; i++) {
    const { minScore, maxScore, creditManagers } = ranges[i];

    if (minScore == null || maxScore == null || !Array.isArray(creditManagers) || creditManagers.length === 0) {
      return res.respond(
        400,
        `Range ${i + 1} is missing required fields (minScore, maxScore, creditManagers[])!`
      );
    }

    if (typeof minScore !== "number" || typeof maxScore !== "number") {
      return res.respond(400, `Range ${i + 1}: minScore and maxScore must be numbers!`);
    }

    if (minScore > maxScore) {
      return res.respond(400, `Range ${i + 1}: minScore cannot be greater than maxScore!`);
    }

    for (let j = 0; j < creditManagers.length; j++) {
      const manager = await prisma.associateSubAdmin.findUnique({
        where: { id: creditManagers[j] },
      });
      if (!manager || manager.isDeleted) {
        return res.respond(404, `Credit Manager not found or inactive for range ${i + 1}, position ${j + 1}`);
      }
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.productCreditAssignmentRule.deleteMany({
      where: { masterProductId },
    });

    const allRules = [];

    for (let i = 0; i < ranges.length; i++) {
      const { minScore, maxScore, creditManagers } = ranges[i];

      for (let j = 0; j < creditManagers.length; j++) {
        const rule = await tx.productCreditAssignmentRule.create({
          data: {
            masterProductId,
            minScore,
            maxScore,
            chainOrder: j + 1,
            creditManagerId: creditManagers[j],
          },
        });
        allRules.push(rule);
      }
    }

    return allRules;
  });

  res.respond(201, "Product assignment rules created successfully!", result);
});

// ##########----------List Product Assignment Rules----------##########
const getAssignmentRules = asyncHandler(async (req, res) => {
  const { masterProductId } = req.params;

  const rules = await prisma.productCreditAssignmentRule.findMany({
    where: { masterProductId, isDeleted: false },
    include: {
      creditManager: { include: { role: true, user: { select: { email: true, phone: true } } } },
    },
    orderBy: [{ minScore: "asc" }, { chainOrder: "asc" }],
    orderBy: [{ minScore: "asc" }, { chainOrder: "asc" }],
  });

  res.respond(200, "Product assignment rules fetched successfully!", rules);
});

// ##########----------Update Product Assignment Rule----------##########
const updateAssignmentRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { minScore, maxScore, chainOrder, creditManagerId } = req.body;

  const existingRule = await prisma.productCreditAssignmentRule.findFirst({
    where: { id, isDeleted: false },
  });
  if (!existingRule) return res.respond(404, "Rule not found!");

  if (minScore != null && maxScore != null && minScore > maxScore) {
    return res.respond(400, "minScore cannot be greater than maxScore!");
  }

  if (minScore != null && maxScore != null) {
    const overlap = await prisma.productCreditAssignmentRule.findFirst({
      where: {
        masterProductId: existingRule.masterProductId,
        id: { not: id },
        isDeleted: false,
        OR: [
          { minScore: { lte: maxScore }, maxScore: { gte: minScore } },
        ],
      },
    });
    if (overlap) return res.respond(400, "Overlapping rule exists for this product!");
  }

  if (creditManagerId) {
    const manager = await prisma.associateSubAdmin.findFirst({
      where: { id: creditManagerId, isDeleted: false },
    });
    if (!manager) return res.respond(404, "Credit Manager not found or invalid role!");
  }

  const updatedRule = await prisma.productCreditAssignmentRule.update({
    where: { id },
    data: { minScore, maxScore, chainOrder, creditManagerId },
  });

  res.respond(200, "Assignment rule updated successfully!", updatedRule);
});


// ##########----------Delete Product Assignment Rule (Soft Delete)----------##########
const deleteAssignmentRule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const rule = await prisma.productCreditAssignmentRule.findFirst({
    where: { id, isDeleted: false },
  });
  if (!rule) return res.respond(404, "Rule not found!");

  await prisma.productCreditAssignmentRule.update({
    where: { id },
    data: { isDeleted: true },
  });

  res.respond(200, "Assignment rule deleted successfully!");
});

module.exports = {
  createAssignmentRule,
  getAssignmentRules,
  updateAssignmentRule,
  deleteAssignmentRule
}