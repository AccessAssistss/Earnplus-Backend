const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Repayment Mode----------##########
const createRepaymentMode = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.respond(400, "Repayment Mode name is required!");
  }

  const existingMode = await prisma.repaymentModes.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
    },
  });

  if (existingMode) {
    return res.respond(400, "Repayment Mode with this name already exists!");
  }

  const newMode = await prisma.repaymentModes.create({
    data: { name },
  });

  res.respond(201, "Repayment Mode Created Successfully!", newMode);
});

// ##########----------Update Repayment Mode----------##########
const updateRepaymentMode = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { modeId } = req.params;

  if (!name) {
    return res.respond(400, "Repayment Mode name is required!");
  }

  const existingMode = await prisma.repaymentModes.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: modeId },
    },
  });

  if (existingMode) {
    return res.respond(400, "Repayment Mode with this name already exists!");
  }

  const updatedMode = await prisma.repaymentModes.update({
    where: { id: modeId },
    data: { name },
  });

  res.respond(200, "Repayment Mode Updated Successfully!", updatedMode);
});

// ##########----------Get All Repayment Modes----------##########
const getAllRepaymentModes = asyncHandler(async (req, res) => {
  const modes = await prisma.repaymentModes.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Repayment Modes fetched Successfully!", modes);
});

// ##########----------Soft Delete Repayment Mode----------##########
const softDeleteRepaymentMode = asyncHandler(async (req, res) => {
  const { modeId } = req.params;

  const deletedMode = await prisma.repaymentModes.update({
    where: { id: modeId },
    data: { isDeleted: true },
  });

  res.respond(200, "Repayment Mode deleted (Soft Delete) Successfully!", deletedMode);
});

module.exports = {
  createRepaymentMode,
  updateRepaymentMode,
  getAllRepaymentModes,
  softDeleteRepaymentMode,
};
