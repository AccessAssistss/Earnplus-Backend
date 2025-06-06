const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// Create External Score
const createExternalScore = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.respond(400, "External Score name is required!");
  }

  const existingScore = await prisma.externalScore.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
    },
  });

  if (existingScore) {
    return res.respond(400, "External Score with this name already exists!");
  }

  const newScore = await prisma.externalScore.create({
    data: { name },
  });

  res.respond(201, "External Score Created Successfully!", newScore);
});

// Update External Score
const updateExternalScore = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { externalScoreId } = req.params;

  if (!name) {
    return res.respond(400, "External Score name is required!");
  }

  const existingScore = await prisma.externalScore.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: externalScoreId },
    },
  });

  if (existingScore) {
    return res.respond(400, "External Score with this name already exists!");
  }

  const updatedScore = await prisma.externalScore.update({
    where: { id: externalScoreId },
    data: { name },
  });

  res.respond(200, "External Score Updated Successfully!", updatedScore);
});

// Get All External Scores
const getAllExternalScores = asyncHandler(async (req, res) => {
  const scores = await prisma.externalScore.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "External Scores fetched Successfully!", scores);
});

// Soft Delete External Score
const softDeleteExternalScore = asyncHandler(async (req, res) => {
  const { externalScoreId } = req.params;

  const deletedScore = await prisma.externalScore.update({
    where: { id: externalScoreId },
    data: { isDeleted: true },
  });

  res.respond(200, "External Score deleted (Soft Delete) Successfully!", deletedScore);
});

module.exports = {
  createExternalScore,
  updateExternalScore,
  getAllExternalScores,
  softDeleteExternalScore,
};
