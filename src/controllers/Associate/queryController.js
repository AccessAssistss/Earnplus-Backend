const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Raise Query For Associate Subadmin by Associate Subadmin----------##########
const createQuery = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    assignedToId,
    productId,
    employerName,
    categoryId,
    subCategoryId,
    urgency,
    description,
  } = req.body;
  if (!categoryId || !subCategoryId || !description || !urgency) {
    return res.respond(
      400,
      "Missing required fields: raisedById, categoryId, subCategoryId, description, urgency"
    );
  }

  const raisedBy = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
  });
  if (!raisedBy) return res.respond(404, "RaisedBy user not found!");

  if (assignedToId) {
    const assignedTo = await prisma.associateSubAdmin.findFirst({
      where: { id: assignedToId, isDeleted: false },
    });
    if (!assignedTo) return res.respond(404, "AssignedTo user not found!");
  }

  if (productId) {
    const product = await prisma.variantProduct.findFirst({
      where: { id: productId, isDeleted: false },
    });
    if (!product) return res.respond(404, "Variant Product not found!");
  }

  const category = await prisma.queryCategory.findFirst({
    where: { id: categoryId, isDeleted: false },
  });
  if (!category) return res.respond(404, "Query Category not found!");

  const subCategory = await prisma.querySubCategory.findFirst({
    where: { id: subCategoryId, isDeleted: false },
  });
  if (!subCategory) return res.respond(404, "Query SubCategory not found!");

  const query = await prisma.raiseQuery.create({
    data: {
      raisedById: raisedBy.id,
      assignedToId,
      productId,
      employerName,
      categoryId,
      subCategoryId,
      urgency,
      description,
    },
  });

  res.respond(201, "Query raised successfully", query);
});

// ##########----------Get Raised Query For Associate Subadmin by Associate Subadmin----------##########
const getAllQueries = asyncHandler(async (req, res) => {
  const userId = req.user;

  const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
  });
  if (!associateSubAdmin) {
    return res.respond(403, "SubAdmin not found!");
  }

  const queries = await prisma.raiseQuery.findMany({
    where: {
      assignedToId: associateSubAdmin.id,
      isDeleted: false,
    },
    orderBy: { createdAt: "desc" },
    include: {
      RaisedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      product: {
        select: {
          id: true,
          variantName: true,
          variantCode: true,
          versionId: true,
          productType: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      subCategory: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  res.respond(200, "Queries fetched successfully", queries);
});

// ##########----------Update Query Status by Assigned AssociateSubAdmin----------##########
const updateQueryStatus = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { queryId, queryStatus } = req.body;

  if (!queryId || typeof queryStatus !== "boolean") {
    return res.respond(400, "Missing required fields: queryId, queryStatus");
  }

  const subAdmin = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
  });
  if (!subAdmin) {
    return res.respond(403, "SubAdmin not found!");
  }

  const query = await prisma.raiseQuery.findFirst({
    where: { id: queryId, isDeleted: false },
  });
  if (!query) {
    return res.respond(404, "Query not found!");
  }

  if (query.assignedToId !== subAdmin.id) {
    return res.respond(403, "You are not authorized to update this query.");
  }

  const updatedQuery = await prisma.raiseQuery.update({
    where: { id: queryId },
    data: { queryStatus },
  });

  res.respond(200, "Query status updated successfully", updatedQuery);
});

module.exports = {
  createQuery,
  getAllQueries,
  updateQueryStatus,
};
