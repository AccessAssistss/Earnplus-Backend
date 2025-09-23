const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Product Segment----------##########
const createProductSegment = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.respond(400, "Product Segment name is required!");
  }

  const existingSegment = await prisma.productSegment.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
    },
  });
  if (existingSegment) {
    return res.respond(400, "Product Segment with this name already exists!");
  }

  const newSegment = await prisma.productSegment.create({
    data: { name },
  });

  res.respond(201, "Product Segment Created Successfully!", newSegment);
});

// ##########----------Update Product Segment----------##########
const updateProductSegment = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { segmentId } = req.params;
  if (!name) {
    return res.respond(400, "Product Segment name is required!");
  }

  const existingSegment = await prisma.productSegment.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: segmentId },
    },
  });
  if (existingSegment) {
    return res.respond(400, "Product Segment with this name already exists!");
  }

  const updatedSegment = await prisma.productSegment.update({
    where: { id: segmentId },
    data: { name },
  });

  res.respond(200, "Product Segment Updated Successfully!", updatedSegment);
});

// ##########----------Get All Product Segments----------##########
const getAllProductSegments = asyncHandler(async (req, res) => {
  const segments = await prisma.productSegment.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Product Segments fetched Successfully!", segments);
});

// ##########----------Soft Delete Product Segment----------##########
const softDeleteProductSegment = asyncHandler(async (req, res) => {
  const { segmentId } = req.params;

  const deletedSegment = await prisma.productSegment.update({
    where: { id: segmentId },
    data: { isDeleted: true },
  });

  res.respond(
    200,
    "Product Segment deleted (Soft Delete) Successfully!",
    deletedSegment
  );
});

module.exports = {
  createProductSegment,
  updateProductSegment,
  getAllProductSegments,
  softDeleteProductSegment,
};
