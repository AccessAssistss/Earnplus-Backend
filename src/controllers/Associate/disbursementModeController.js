const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Disbursement Mode----------##########
const createDisbursementMode = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.respond(400, "Disbursement Mode name is required!");
  }

  const existingMode = await prisma.disbursementMode.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
    },
  });

  if (existingMode) {
    return res.respond(400, "Disbursement Mode with this name already exists!");
  }

  const newMode = await prisma.disbursementMode.create({
    data: { name },
  });

  res.respond(201, "Disbursement Mode Created Successfully!", newMode);
});

// ##########----------Update Disbursement Mode----------##########
const updateDisbursementMode = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { modeId } = req.params;

  if (!name) {
    return res.respond(400, "Disbursement Mode name is required!");
  }

  const existingMode = await prisma.disbursementMode.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: modeId },
    },
  });

  if (existingMode) {
    return res.respond(400, "Disbursement Mode with this name already exists!");
  }

  const updatedMode = await prisma.disbursementMode.update({
    where: { id: modeId },
    data: { name },
  });

  res.respond(200, "Disbursement Mode Updated Successfully!", updatedMode);
});

// ##########----------Get All Disbursement Modes----------##########
const getAllDisbursementModes = asyncHandler(async (req, res) => {
  const modes = await prisma.disbursementMode.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Disbursement Modes fetched Successfully!", modes);
});

// ##########----------Soft Delete Disbursement Mode----------##########
const softDeleteDisbursementMode = asyncHandler(async (req, res) => {
  const { modeId } = req.params;

  const deletedMode = await prisma.disbursementMode.update({
    where: { id: modeId },
    data: { isDeleted: true },
  });

  res.respond(200, "Disbursement Mode deleted (Soft Delete) Successfully!", deletedMode);
});

module.exports = {
  createDisbursementMode,
  updateDisbursementMode,
  getAllDisbursementModes,
  softDeleteDisbursementMode,
};
