const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------Query Category--------------------####################
// ##########----------Create Query Category----------##########
const createQueryCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) return res.respond(400, "Query Category name is required!");

  const exists = await prisma.queryCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, isDeleted: false },
  });
  if (exists)
    return res.respond(400, "Query Category with this name already exists!");

  const created = await prisma.queryCategory.create({ data: { name } });

  res.respond(201, "Query Category Created Successfully!", created);
});

// ##########----------Update Query Category----------##########
const updateQueryCategory = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { categoryId } = req.params;
  if (!name) return res.respond(400, "Query Category name is required!");

  const exists = await prisma.queryCategory.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: categoryId },
    },
  });
  if (exists)
    return res.respond(400, "Query Category with this name already exists!");

  const updated = await prisma.queryCategory.update({
    where: { id: categoryId },
    data: { name },
  });

  res.respond(200, "Query Category Updated Successfully!", updated);
});

// ##########----------Get All Query Categories----------##########
const getAllQueryCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.queryCategory.findMany({
    where: { isDeleted: false },
    include: { QuerySubCategory: { where: { isDeleted: false } } },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Query Categories Fetched Successfully!", categories);
});

// ##########----------Soft Delete Query Category----------##########
const softDeleteQueryCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;

  await prisma.querySubCategory.updateMany({
    where: { queryCategoryId: categoryId },
    data: { isDeleted: true },
  });

  const deleted = await prisma.queryCategory.update({
    where: { id: categoryId },
    data: { isDeleted: true },
  });

  res.respond(
    200,
    "Query Category deleted (Soft Delete) Successfully!",
    deleted
  );
});

// ####################--------------------Query Sub-Category--------------------####################
// ##########----------Create Query SubCategory----------##########
const createQuerySubCategory = asyncHandler(async (req, res) => {
  const { name, description, queryCategoryId } = req.body;
  if (!name || !queryCategoryId) {
    return res.respond(
      400,
      "SubCategory name and Query Category ID are required!"
    );
  }

  const exists = await prisma.querySubCategory.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      queryCategoryId,
      isDeleted: false,
    },
  });
  if (exists)
    return res.respond(400, "SubCategory with this name already exists!");

  const created = await prisma.querySubCategory.create({
    data: { name, description, queryCategoryId },
  });

  res.respond(201, "Query SubCategory Created Successfully!", created);
});

// ##########----------Update Query SubCategory----------##########
const updateQuerySubCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { subCategoryId } = req.params;
  if (!name) return res.respond(400, "SubCategory name is required!");

  const existing = await prisma.querySubCategory.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: subCategoryId },
    },
  });
  if (existing)
    return res.respond(400, "SubCategory with this name already exists!");

  const updated = await prisma.querySubCategory.update({
    where: { id: subCategoryId },
    data: { name, description },
  });

  res.respond(200, "Query SubCategory Updated Successfully!", updated);
});

// ##########----------Get All Query SubCategories----------##########
const getAllQuerySubCategories = asyncHandler(async (req, res) => {
  const subCategories = await prisma.querySubCategory.findMany({
    where: { isDeleted: false },
    include: { queryCategory: true },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Query SubCategories Fetched Successfully!", subCategories);
});

// ##########----------Soft Delete Query SubCategory----------##########
const softDeleteQuerySubCategory = asyncHandler(async (req, res) => {
  const { subCategoryId } = req.params;

  const deleted = await prisma.querySubCategory.update({
    where: { id: subCategoryId },
    data: { isDeleted: true },
  });

  res.respond(200, "Query SubCategory Soft Deleted Successfully!", deleted);
});

module.exports = {
  createQueryCategory,
  updateQueryCategory,
  getAllQueryCategories,
  softDeleteQueryCategory,
  createQuerySubCategory,
  updateQuerySubCategory,
  getAllQuerySubCategories,
  softDeleteQuerySubCategory,
};
