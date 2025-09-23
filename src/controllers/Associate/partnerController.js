const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Product Partner----------##########
const createProductPartner = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.respond(400, "Product Partner name is required!");
  }

  const existingPartner = await prisma.productPartner.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
    },
  });
  if (existingPartner) {
    return res.respond(400, "Product Partner with this name already exists!");
  }

  const newPartner = await prisma.productPartner.create({
    data: { name },
  });

  res.respond(201, "Product Partner Created Successfully!", newPartner);
});

// ##########----------Update Product Partner----------##########
const updateProductPartner = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { partnerId } = req.params;
  if (!name) {
    return res.respond(400, "Product Partner name is required!");
  }

  const existingPartner = await prisma.productPartner.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: partnerId },
    },
  });
  if (existingPartner) {
    return res.respond(400, "Product Partner with this name already exists!");
  }

  const updatedPartner = await prisma.productPartner.update({
    where: { id: partnerId },
    data: { name },
  });

  res.respond(200, "Product Partner Updated Successfully!", updatedPartner);
});

// ##########----------Get All Product Partners----------##########
const getAllProductPartners = asyncHandler(async (req, res) => {
  const partners = await prisma.productPartner.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Product Partners fetched Successfully!", partners);
});

// ##########----------Soft Delete Product Partner----------##########
const softDeleteProductPartner = asyncHandler(async (req, res) => {
  const { partnerId } = req.params;

  const deletedPartner = await prisma.productPartner.update({
    where: { id: partnerId },
    data: { isDeleted: true },
  });

  res.respond(200, "Product Partner deleted (Soft Delete) Successfully!", deletedPartner);
});

module.exports = {
  createProductPartner,
  updateProductPartner,
  getAllProductPartners,
  softDeleteProductPartner,
};
