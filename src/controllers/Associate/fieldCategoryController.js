const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// Create Field Category
const createFieldCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.respond(400, "Field Category name is required!");
  }

  const existingCategory = await prisma.fieldCategory.findFirst({
    where: { name, isDeleted: false },
  });

  if (existingCategory) {
    return res.respond(400, "Field Category with this name already exists!");
  }

  const newCategory = await prisma.fieldCategory.create({
    data: { name },
  });

  res.respond(201, "Field Category Created Successfully!", newCategory);
});

// Update Field Category
const updateFieldCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { name } = req.body;

  const categoryExists = await prisma.fieldCategory.findUnique({
    where: { id: categoryId },
  });

  if (!categoryExists || categoryExists.isDeleted) {
    return res.respond(404, "Field Category not found!");
  }

  const updatedCategory = await prisma.fieldCategory.update({
    where: { id: categoryId },
    data: { name },
  });

  res.respond(200, "Field Category Updated Successfully!", updatedCategory);
});

// Get All Field Categories
const getAllFieldCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.fieldCategory.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Field Categories fetched Successfully!", categories);
});

// Soft Delete Field Category
const softDeleteFieldCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  const categoryExists = await prisma.fieldCategory.findUnique({
    where: { id: categoryId },
  });

  if (!categoryExists || categoryExists.isDeleted) {
    return res.respond(404, "Field Category not found!");
  }

  const deletedCategory = await prisma.fieldCategory.update({
    where: { id: categoryId },
    data: { isDeleted: true },
  });

  res.respond(200, "Field Category Soft Deleted Successfully!", deletedCategory);
});

module.exports = {
  createFieldCategory,
  updateFieldCategory,
  getAllFieldCategories,
  softDeleteFieldCategory,
};
