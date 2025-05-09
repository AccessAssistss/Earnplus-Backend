const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Contract Combination----------##########
const createContractCombination = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    employerId,
    contractTypeId,
    name,
    paymentFrequency,
    remark,
    payoutDates,
  } = req.body;

  if (
    !employerId ||
    !contractTypeId ||
    !name ||
    !paymentFrequency ||
    !remark ||
    !Array.isArray(payoutDates) ||
    payoutDates.length === 0
  ) {
    return res.respond(
      400,
      "All fields are required with at least one payout date!"
    );
  }

  const ERM = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });
  if (!ERM || ERM.role.roleName !== "ERM") {
    return res.respond(403, "Only ERMs can create contract combinations!");
  }

  const employer = await prisma.employer.findFirst({
    where: { id: employerId, isDeleted: false },
  });
  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  const employerContractType = await prisma.employerContractType.findFirst({
    where: { id: contractTypeId, isDeleted: false },
  });
  if (!employerContractType) {
    return res.respond(404, "Employer Contract Type not found!");
  }

  const count = await prisma.employerContractTypeCombination.count({
    where: { employerId },
  });

  const sequence = String(count + 1).padStart(3, "0");
  const uniqueId = `CT-${employerId}-${sequence}`;

  const combination = await prisma.employerContractTypeCombination.create({
    data: {
      employerId,
      contractTypeId,
      uniqueId,
      name,
      paymentFrequency,
      remark,
    },
  });

  await prisma.payoutDate.createMany({
    data: payoutDates.map((date) => ({
      contractCombinationId: combination.id,
      startDate: new Date(date.startDate),
      endDate: new Date(date.endDate),
    })),
  });

  res.respond(201, "Contract Combination created successfully!", combination);
});

// ##########----------Get Contract Combinations----------##########
const getContractCombinations = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { employerId, contractTypeId } = req.query;

  const ERM = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });
  if (!ERM || ERM.role.roleName !== "ERM") {
    return res.respond(403, "Only ERMs can create contract combinations!");
  }

  const employer = await prisma.employer.findFirst({
    where: { id: employerId, isDeleted: false },
  });
  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  const employerContractType = await prisma.employerContractType.findFirst({
    where: { id: contractTypeId, isDeleted: false },
  });
  if (!employerContractType) {
    return res.respond(404, "Employer Contract Type not found!");
  }

  const combinations = await prisma.employerContractTypeCombination.findMany({
    where: {
      isDeleted: false,
      employerId,
      contractTypeId,
    },
    include: {
      payoutDates: {
        startDate: true,
        endDate: true,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.respond(200, "Contract Combinations fetched successfully!", combinations);
});

// ##########----------Create Contract Rule Book----------##########
const createContractRuleBook = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    contractCombinationId,
    name,
    tenureRule,
    salaryBand,
    designation,
    remark,
  } = req.body;

  if (
    !contractCombinationId ||
    !name ||
    !tenureRule ||
    !remark ||
    !salaryBand ||
    !designation
  ) {
    return res.respond(400, "All fields are required!");
  }

  const ERM = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });
  if (!ERM || ERM.role.roleName !== "ERM") {
    return res.respond(403, "Only ERMs can create contract combinations!");
  }

  const contractCombination =
    await prisma.employerContractTypeCombination.findFirst({
      where: { id: contractCombinationId, isDeleted: false },
    });
  if (!contractCombination) {
    return res.respond(404, "Contract Combination not found!");
  }

  const ruleBook = await prisma.contractCombinationRuleBook.create({
    data: {
      contractCombinationId,
      name,
      tenureRule,
      salaryBand,
      designation,
      remark,
    },
  });

  res.respond(
    201,
    "Contract Combination Rule Book created successfully!",
    ruleBook
  );
});

const getContractRuleBooks = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { contractCombinationId } = req.query;

  const ERM = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });
  if (!ERM || ERM.role.roleName !== "ERM") {
    return res.respond(403, "Only ERMs can create contract combinations!");
  }

  const ruleBooks = await prisma.contractCombinationRuleBook.findMany({
    where: {
      isDeleted: false,
      contractCombinationId,
    },
    include: {
      contractCombination: {
        id: true,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.respond(200, "Contract Rule Books fetched successfully!", ruleBooks);
});

module.exports = {
  createContractCombination,
  getContractCombinations,
  createContractRuleBook,
  getContractRuleBooks,
};
