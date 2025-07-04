const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------Product Category--------------------####################
// ##########----------Create Product Category----------##########
const createProductCategory = asyncHandler(async (req, res) => {
  const { categoryName } = req.body;
  if (!categoryName) {
    return res.respond(400, "Product Category name is required!");
  }

  const existingProductCategory = await prisma.productCategory.findFirst({
    where: {
      categoryName: { equals: categoryName, mode: "insensitive" },
      isDeleted: false,
    },
  });
  if (existingProductCategory) {
    return res.respond(400, "ProductCategory with this name already exists!");
  }

  const productCategory = await prisma.productCategory.create({
    data: { categoryName },
  });

  res.respond(200, "ProductCategory Created Successfully!", productCategory);
});

// ##########----------Update Product Category----------##########
const updateProductCategory = asyncHandler(async (req, res) => {
  const { categoryName } = req.body;
  if (!categoryName) {
    return res.respond(400, "Product Category name is required!");
  }

  const existingProductCategory = await prisma.productCategory.findFirst({
    where: {
      categoryName: { equals: categoryName, mode: "insensitive" },
      isDeleted: false,
      NOT: {
        id: req.params.productCategoryId,
      },
    },
  });

  if (existingProductCategory) {
    return res.respond(400, "Product Category with this name already exists!");
  }

  const updatedProductCategory = await prisma.productCategory.update({
    where: { id: req.params.productCategoryId },
    data: { categoryName },
  });

  res.respond(
    200,
    "Product Category Updated Successfully!",
    updatedProductCategory
  );
});

// ##########----------Get All Product Categories----------##########
const getAllProductCategories = asyncHandler(async (req, res) => {
  const countries = await prisma.productCategory.findMany({
    where: { isDeleted: false },
    orderBy: { categoryName: "asc" },
  });

  res.respond(200, "Product Categories fetched Successfully!", countries);
});

// ##########----------Soft Delete Product Category----------##########
const softDeleteProductCategory = asyncHandler(async (req, res) => {
  const { productCategoryId } = req.params;

  // #####-----Get all productPurpose under the given procuct Category-----#####
  const productPurpose = await prisma.productPurpose.findMany({
    where: { productCategoryId },
  });

  // #####-----Soft delete all productPurpose under the given procuct Category-----#####
  await prisma.productPurpose.updateMany({
    where: { productCategoryId },
    data: { isDeleted: true },
  });

  const deletedProductCategory = await prisma.productCategory.update({
    where: { id: productCategoryId },
    data: { isDeleted: true },
  });

  res.respond(
    200,
    "Product Category deleted(Soft Delete) Successfully!",
    deletedProductCategory
  );
});

// ####################--------------------Product Purpose--------------------####################
// ##########----------Create Product Purpose----------##########
const createProductPurpose = asyncHandler(async (req, res) => {
  const { purpose } = req.body;
  if ((!purpose)) {
    return res.respond(
      400,
      "Product Purpose name And Product Category ID are required!"
    );
  }

  const existingProductPurpose = await prisma.productPurpose.findFirst({
    where: {
      purpose: { equals: purpose, mode: "insensitive" },
      isDeleted: false,
    },
  });
  if (existingProductPurpose) {
    return res.respond(
      400,
      "Product Purpose with this name already exists!"
    );
  }

  const productPurpose = await prisma.productPurpose.create({
    data: { purpose },
  });

  res.respond(200, "Product Purpose Created Successfully!", productPurpose);
});

// ##########----------Update Product Purpose----------##########
const updateProductPurpose = asyncHandler(async (req, res) => {
  const { purpose } = req.body;
  if (!purpose) {
    return res.respond(400, "Product Purpose name is required!");
  }
  const existingProductPurpose = await prisma.productPurpose.findFirst({
    where: {
      purpose: { equals: purpose, mode: "insensitive" },
      isDeleted: false,
      NOT: {
        id: req.params.productPurposeId,
      },
    },
  });

  if (existingProductPurpose) {
    return res.respond(
      400,
      "Product Purpose with this name already exists!"
    );
  }

  const updatedProductPurpose = await prisma.productPurpose.update({
    where: { id: req.params.productPurposeId },
    data: { purpose },
  });

  res.respond(
    200,
    "Product Purpose Updated Successfully!",
    updatedProductPurpose
  );
});

// ##########----------Get All Product Purposes----------##########
const getProductPurposes = asyncHandler(async (req, res) => {
  const productPurpose = await prisma.productPurpose.findMany({
    where: { isDeleted: false },
    orderBy: { purpose: "asc" },
  });

  res.respond(200, "product Purpose fetched Successfully!", productPurpose);
});

// ##########----------Soft Delete Product Purpose----------##########
const softDeleteProductPurpose = asyncHandler(async (req, res) => {
  const { productPurposeId } = req.params;

  const deletedProductPurpose = await prisma.productPurpose.update({
    where: { id: productPurposeId },
    data: { isDeleted: true },
  });

  res.respond(
    200,
    "Product Purpose deleted(Soft Delete) Successfully!",
    deletedProductPurpose
  );
});

module.exports = {
  createProductCategory,
  updateProductCategory,
  getAllProductCategories,
  softDeleteProductCategory,
  createProductPurpose,
  updateProductPurpose,
  getProductPurposes,
  softDeleteProductPurpose,
};
