const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// Create Score Variable
const createScoreVariable = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.respond(400, "Score Variable name is required!");
  }

  const existingVariable = await prisma.scoreVariable.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
    },
  });
  if (existingVariable) {
    return res.respond(400, "Score Variable with this name already exists!");
  }

  const newVariable = await prisma.scoreVariable.create({
    data: { name },
  });

  res.respond(201, "Score Variable Created Successfully!", newVariable);
});

// Update Score Variable
const updateScoreVariable = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { scoreVariableId } = req.params;
  if (!name) {
    return res.respond(400, "Score Variable name is required!");
  }

  const existingVariable = await prisma.scoreVariable.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: scoreVariableId },
    },
  });
  if (existingVariable) {
    return res.respond(400, "Score Variable with this name already exists!");
  }

  const updatedVariable = await prisma.scoreVariable.update({
    where: { id: scoreVariableId },
    data: { name },
  });

  res.respond(200, "Score Variable Updated Successfully!", updatedVariable);
});

// Get All Score Variables
const getAllScoreVariables = asyncHandler(async (req, res) => {
  const variables = await prisma.scoreVariable.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Score Variables fetched Successfully!", variables);
});

// Soft Delete Score Variable
const softDeleteScoreVariable = asyncHandler(async (req, res) => {
  const { scoreVariableId } = req.params;

  const deletedVariable = await prisma.scoreVariable.update({
    where: { id: scoreVariableId },
    data: { isDeleted: true },
  });

  res.respond(200, "Score Variable deleted (Soft Delete) Successfully!", deletedVariable);
});

module.exports = {
  createScoreVariable,
  updateScoreVariable,
  getAllScoreVariables,
  softDeleteScoreVariable,
};
