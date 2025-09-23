const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Loan Type----------##########
const createLoanType = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.respond(400, "Loan Type name is required!");
  }

  const existingLoanType = await prisma.loanType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
    },
  });
  if (existingLoanType) {
    return res.respond(400, "Loan Type with this name already exists!");
  }

  const newLoanType = await prisma.loanType.create({
    data: { name },
  });

  res.respond(201, "Loan Type Created Successfully!", newLoanType);
});

// ##########----------Update Loan Type----------##########
const updateLoanType = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { loanTypeId } = req.params;
  if (!name) {
    return res.respond(400, "Loan Type name is required!");
  }

  const existingLoanType = await prisma.loanType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      isDeleted: false,
      NOT: { id: loanTypeId },
    },
  });
  if (existingLoanType) {
    return res.respond(400, "Loan Type with this name already exists!");
  }

  const updatedLoanType = await prisma.loanType.update({
    where: { id: loanTypeId },
    data: { name },
  });

  res.respond(200, "Loan Type Updated Successfully!", updatedLoanType);
});

// ##########----------Get All Loan Types----------##########
const getAllLoanTypes = asyncHandler(async (req, res) => {
  const loanTypes = await prisma.loanType.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Loan Types fetched Successfully!", loanTypes);
});

// ##########----------Soft Delete Loan Type----------##########
const softDeleteLoanType = asyncHandler(async (req, res) => {
  const { loanTypeId } = req.params;

  const deletedLoanType = await prisma.loanType.update({
    where: { id: loanTypeId },
    data: { isDeleted: true },
  });

  res.respond(200, "Loan Type deleted (Soft Delete) Successfully!", deletedLoanType);
});

module.exports = {
  createLoanType,
  updateLoanType,
  getAllLoanTypes,
  softDeleteLoanType,
};
