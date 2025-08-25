const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// Create Dropdown for a Field
const createDropdown = asyncHandler(async (req, res) => {
  const { fieldId, value, label } = req.body;

  if (!fieldId) {
    return res.respond(400, "FieldId is required!");
  }

  const fieldExists = await prisma.field.findUnique({ where: { id: fieldId, isDeleted: false } });
  if (!fieldExists) {
    return res.respond(404, "Field not found!");
  }

  const newDropdown = await prisma.dropdown.create({
    data: { fieldId, value, label },
  });

  res.respond(201, "Dropdown Created Successfully!", newDropdown);
});

// Update Dropdown
const updateDropdown = asyncHandler(async (req, res) => {
  const { dropdownId } = req.params;
  const { value, label } = req.body;

  const dropdownExists = await prisma.dropdown.findUnique({ where: { id: dropdownId } });
  if (!dropdownExists || dropdownExists.isDeleted) {
    return res.respond(404, "Dropdown not found!");
  }

  const updatedDropdown = await prisma.dropdown.update({
    where: { id: dropdownId },
    data: { value, label },
  });

  res.respond(200, "Dropdown Updated Successfully!", updatedDropdown);
});

// Get all Dropdowns for a Field
const getDropdownsByField = asyncHandler(async (req, res) => {
  const { fieldId } = req.params;

  const dropdowns = await prisma.dropdown.findMany({
    where: { fieldId, isDeleted: false },
    orderBy: { label: "asc" },
  });

  res.respond(200, "Dropdowns fetched Successfully!", dropdowns);
});

// Soft Delete Dropdown
const softDeleteDropdown = asyncHandler(async (req, res) => {
  const { dropdownId } = req.params;

  const deletedDropdown = await prisma.dropdown.update({
    where: { id: dropdownId },
    data: { isDeleted: true },
  });

  res.respond(200, "Dropdown deleted Soft Delete Successfully!", deletedDropdown);
});

module.exports = {
  createDropdown,
  updateDropdown,
  getDropdownsByField,
  softDeleteDropdown,
};
