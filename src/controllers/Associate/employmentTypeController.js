const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// Create Employment Type
const createEmploymentType = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.respond(400, "Employment Type name is required!");
  }

  const existingType = await prisma.employmentType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
    },
  });
  if (existingType) {
    return res.respond(400, "Employment Type with this name already exists!");
  }

  const newType = await prisma.employmentType.create({
    data: { name },
  });

  res.respond(201, "Employment Type Created Successfully!", newType);
});

// Update Employment Type
const updateEmploymentType = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { employmentTypeId } = req.params;
  if (!name) {
    return res.respond(400, "Employment Type name is required!");
  }

  const existingType = await prisma.employmentType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: employmentTypeId },
    },
  });
  if (existingType) {
    return res.respond(400, "Employment Type with this name already exists!");
  }

  const updatedType = await prisma.employmentType.update({
    where: { id: employmentTypeId },
    data: { name },
  });

  res.respond(200, "Employment Type Updated Successfully!", updatedType);
});

// Get All Employment Types
const getAllEmploymentTypes = asyncHandler(async (req, res) => {
  const types = await prisma.employmentType.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Employment Types fetched Successfully!", types);
});

// Soft Delete Employment Type
const softDeleteEmploymentType = asyncHandler(async (req, res) => {
  const { employmentTypeId } = req.params;

  const deletedType = await prisma.employmentType.update({
    where: { id: employmentTypeId },
    data: { isDeleted: true },
  });

  res.respond(200, "Employment Type deleted (Soft Delete) Successfully!", deletedType);
});

module.exports = {
  createEmploymentType,
  updateEmploymentType,
  getAllEmploymentTypes,
  softDeleteEmploymentType,
};
