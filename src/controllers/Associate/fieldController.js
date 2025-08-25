const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// Create Field
const createField = asyncHandler(async (req, res) => {
  const { name, fieldType, isMainField } = req.body;

  if (!name) {
    return res.respond(400, "Field name is required!");
  }
  if (!fieldType) {
    return res.respond(400, "Field type is required!");
  }

  const existingField = await prisma.field.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
    },
  });
  if (existingField) {
    return res.respond(400, "Field with this name already exists!");
  }

  const newField = await prisma.field.create({
    data: {
      name,
      fieldType,
      isMainField: isMainField ?? false,
    },
  });

  res.respond(201, "Field Created Successfully!", newField);
});

// Update Field
const updateField = asyncHandler(async (req, res) => {
  const { name, fieldType, isMainField } = req.body;
  const { fieldId } = req.params;

  if (!name) {
    return res.respond(400, "Field name is required!");
  }
  if (!fieldType) {
    return res.respond(400, "Field type is required!");
  }

  const existingField = await prisma.field.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: fieldId },
    },
  });
  if (existingField) {
    return res.respond(400, "Field with this name already exists!");
  }

  const updatedField = await prisma.field.update({
    where: { id: fieldId },
    data: {
      name,
      fieldType,
      isMainField: isMainField ?? false,
    },
  });

  res.respond(200, "Field Updated Successfully!", updatedField);
});

// Get All Fields
const getAllFields = asyncHandler(async (req, res) => {
  const fields = await prisma.field.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Fields fetched Successfully!", fields);
});

// Soft Delete Field
const softDeleteField = asyncHandler(async (req, res) => {
  const { fieldId } = req.params;

  const deletedField = await prisma.field.update({
    where: { id: fieldId },
    data: { isDeleted: true },
  });

  res.respond(200, "Field deleted (Soft Delete) Successfully!", deletedField);
});

module.exports = {
  createField,
  updateField,
  getAllFields,
  softDeleteField,
};
