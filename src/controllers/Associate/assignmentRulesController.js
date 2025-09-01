const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// Create Assignment Rule
const createAssignmentRule = asyncHandler(async (req, res) => {
  const { minScore, maxScore, chainOrder, creditManagerId } = req.body;

  if (minScore == null || maxScore == null || !chainOrder || !creditManagerId) {
    return res.respond(400, "All fields (minScore, maxScore, chainOrder, creditManagerId) are required!");
  }

  const manager = await prisma.associateSubAdmin.findUnique({
    where: { id: creditManagerId },
  });

  if (!manager) return res.respond(404, "Credit Manager not found!");

  const rule = await prisma.loanAssignmentRule.create({
    data: { minScore, maxScore, chainOrder, creditManagerId },
  });

  res.respond(201, "Assignment rule created successfully!", rule);
});

// List Assignment Rules
const getAssignmentRules = asyncHandler(async (req, res) => {
  const rules = await prisma.loanAssignmentRule.findMany({
    include: { creditManager: true },
    orderBy: [{ minScore: "asc" }, { chainOrder: "asc" }],
  });

  res.respond(200, "Assignment rules fetched successfully!", rules);
});

// Update Assignment Rule
const updateAssignmentRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { minScore, maxScore, chainOrder, creditManagerId } = req.body;

  const existingRule = await prisma.loanAssignmentRule.findUnique({ where: { id } });
  if (!existingRule) return res.respond(404, "Rule not found!");

  const updatedRule = await prisma.loanAssignmentRule.update({
    where: { id },
    data: { minScore, maxScore, chainOrder, creditManagerId },
  });

  res.respond(200, "Assignment rule updated successfully!", updatedRule);
});

// Delete Assignment Rule
const deleteAssignmentRule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const rule = await prisma.loanAssignmentRule.findUnique({ where: { id } });
  if (!rule) return res.respond(404, "Rule not found!");

  await prisma.loanAssignmentRule.delete({ where: { id } });
  res.respond(200, "Assignment rule deleted successfully!");
});

module.exports = {
    createAssignmentRule,
    getAssignmentRules,
    updateAssignmentRule,
    deleteAssignmentRule
}