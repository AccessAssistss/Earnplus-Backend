const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// Create SubField Mapping
const createSubField = asyncHandler(async (req, res) => {
  const { fieldId, dropdownId } = req.body;

  if (!fieldId || !dropdownId) {
    return res.respond(400, "fieldId and dropdownId are required!");
  }

  const fieldExists = await prisma.field.findUnique({ where: { id: fieldId } });
  if (!fieldExists || fieldExists.isDeleted) {
    return res.respond(404, "Field not found!");
  }

  const dropdownExists = await prisma.dropdown.findUnique({ where: { id: dropdownId } });
  if (!dropdownExists || dropdownExists.isDeleted) {
    return res.respond(404, "Dropdown not found!");
  }

  const existingMapping = await prisma.subField.findFirst({
    where: { fieldId, dropdownId },
  });
  if (existingMapping) {
    return res.respond(400, "Mapping already exists!");
  }

  const newSubField = await prisma.subField.create({
    data: { fieldId, dropdownId },
  });

  res.respond(201, "SubField Mapping Created Successfully!", newSubField);
});

// Update SubField
const updateSubField = asyncHandler(async (req, res) => {
  const { subFieldId } = req.params;
  const { fieldId, dropdownId } = req.body;

  const subFieldExists = await prisma.subField.findUnique({ where: { id: subFieldId } });
  if (!subFieldExists) {
    return res.respond(404, "SubField mapping not found!");
  }

  if (fieldId) {
    const fieldExists = await prisma.field.findUnique({ where: { id: fieldId } });
    if (!fieldExists || fieldExists.isDeleted) {
      return res.respond(404, "Field not found!");
    }
  }

  if (dropdownId) {
    const dropdownExists = await prisma.dropdown.findUnique({ where: { id: dropdownId } });
    if (!dropdownExists || dropdownExists.isDeleted) {
      return res.respond(404, "Dropdown not found!");
    }
  }

  const updatedSubField = await prisma.subField.update({
    where: { id: subFieldId },
    data: { fieldId, dropdownId },
  });

  res.respond(200, "SubField Mapping Updated Successfully!", updatedSubField);
});

// Get SubFields by FieldId or DropdownId
const getSubFields = asyncHandler(async (req, res) => {
  const { fieldId, dropdownId } = req.query;

  if (!fieldId && !dropdownId) {
    return res.respond(400, "Please provide either fieldId or dropdownId!");
  }

  const whereClause = {};
  if (fieldId) whereClause.fieldId = fieldId;
  if (dropdownId) whereClause.dropdownId = dropdownId;

  const subFields = await prisma.subField.findMany({
    where: whereClause,
    include: {
      field: true,
      dropdown: true,
    },
  });

  res.respond(200, "SubFields fetched Successfully!", subFields);
});

// Delete SubField (Soft Delete)
const softDeleteSubField = asyncHandler(async (req, res) => {
  const { subFieldId } = req.params;

  const subFieldExists = await prisma.subField.findUnique({ where: { id: subFieldId } });
  if (!subFieldExists || subFieldExists.isDeleted) {
    return res.respond(404, "SubField mapping not found!");
  }

  const deletedSubField = await prisma.subField.update({
    where: { id: subFieldId },
    data: { isDeleted: true },
  });

  res.respond(200, "SubField Mapping Soft Deleted Successfully!", deletedSubField);
});

module.exports = {
  createSubField,
  updateSubField,
  getSubFields,
  softDeleteSubField
};
