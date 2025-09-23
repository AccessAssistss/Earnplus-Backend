const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------Industry Type--------------------####################
// ##########----------Create Industry Type----------##########
const createIndustryType = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.respond(400, "Industry name is required!");
  }

  const existingIndustryType = await prisma.industryType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (existingIndustryType) {
    return res.respond(400, "Industry Type with this name already exists!");
  }

  const createIndustryType = await prisma.industryType.create({
    data: { name },
  });

  res.respond(201, "Industry Type Created Successfully!", createIndustryType);
});

// ##########----------Update Industry Type----------##########
const updateIndustryType = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { industryId } = req.params;
  if (!name) {
    return res.respond(400, "Industry name is required!");
  }

  const existingIndustryType = await prisma.industryType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      NOT: {
        id: industryId,
      },
    },
  });
  if (existingIndustryType) {
    return res.respond(400, "Industry Type with this name already exists!");
  }

  const updatedIndustryType = await prisma.industryType.update({
    where: { id: req.params.industryId },
    data: { name },
  });

  res.respond(200, "Industry Type Updated Successfully!", updatedIndustryType);
});

// ##########----------Get All Countries----------##########
const getAllIndustryTypes = asyncHandler(async (req, res) => {
  const industryTypes = await prisma.industryType.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Industry Types fetched Successfully!", industryTypes);
});

// ##########----------Soft Delete Country----------##########
const softDeleteIndustryType = asyncHandler(async (req, res) => {
  const { industryId } = req.params;

  const deletedIndustryType = await prisma.industryType.update({
    where: { id: industryId },
    data: { isDeleted: true },
  });

  res.respond(
    200,
    "Industry Type deleted(Soft Delete) Successfully!",
    deletedIndustryType
  );
});

module.exports = {
  createIndustryType,
  updateIndustryType,
  getAllIndustryTypes,
  softDeleteIndustryType,
};
