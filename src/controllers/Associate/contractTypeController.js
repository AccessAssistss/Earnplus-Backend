const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------Contract Type--------------------####################
// ##########----------Create Contract Type----------##########
const createContractType = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    return res.respond(400, "Name and Description are required!");
  }

  const existingContractType = await prisma.contractType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existingContractType) {
    return res.respond(400, "Contract Type with this name already exists!");
  }

  const createContractType = await prisma.contractType.create({
    data: { name, description },
  });

  res.respond(201, "Contract Type Created Successfully!", createContractType);
});

// ##########----------Update Contract Type----------##########
const updateContractType = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const { contractId } = req.params;

  const existingContractType = await prisma.contractType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      NOT: {
        id: contractId,
      },
    },
  });

  if (existingContractType) {
    return res.respond(400, "Contract Type with this name already exists!");
  }

  const updatedContractType = await prisma.contractType.update({
    where: { id: req.params.contractId },
    data: { name, description },
  });

  res.respond(200, "Contract Type Updated Successfully!", updatedContractType);
});

// ##########----------Get All Countries----------##########
const getAllContractTypes = asyncHandler(async (req, res) => {
  const contractTypes = await prisma.contractType.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Contract Types fetched Successfully!", contractTypes);
});

// ##########----------Soft Delete Country----------##########
const softDeleteContractType = asyncHandler(async (req, res) => {
  const { contractId } = req.params;

  const deletedContractType = await prisma.contractType.update({
    where: { id: contractId },
    data: { isDeleted: true },
  });

  res.respond(
    200,
    "Contract Type deleted(Soft Delete) Successfully!",
    deletedContractType
  );
});

module.exports = {
  createContractType,
  updateContractType,
  getAllContractTypes,
  softDeleteContractType,
};
