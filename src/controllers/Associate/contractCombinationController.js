const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { generateUniqueContractCombinationId } = require("../../../utils/uniqueCodeGenerator");

const prisma = new PrismaClient();

// ##########----------Create Contract Combination----------##########
const createContractCombination = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    employerId,
    contractTypeId,
    accuralStartAt,
    accuralEndAt,
    payoutDate,
    triggerNextMonth = false
  } = req.body;

  if (
    !employerId ||
    !contractTypeId ||
    !accuralStartAt ||
    !accuralEndAt ||
    !payoutDate
  ) {
    return res.respond(
      400,
      "All fields are required!"
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

  const uniqueId = await generateUniqueContractCombinationId(employerId);

  const combination = await prisma.employerContractTypeCombination.create({
    data: {
      employerId,
      contractTypeId,
      uniqueId,
      triggerNextMonth,
      accuralStartAt: new Date(accuralStartAt),
      accuralEndAt: new Date(accuralEndAt),
      payoutDate: new Date(payoutDate),
    },
  });

  res.respond(201, "Contract Combination created successfully!", combination);
});

// ##########----------Get Contract Combinations----------##########
const getContractCombinations = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { employerId, contractTypeId } = req.query;

  if (!employerId || !contractTypeId) {
    return res.respond(400, "employerId and contractTypeId are required!");
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

  const combinations = await prisma.employerContractTypeCombination.findMany({
    where: {
      isDeleted: false,
      employerId,
      contractTypeId,
    },
    select: {
      id: true,
      uniqueId: true,
      triggerNextMonth: true,
      accuralStartAt: true,
      accuralEndAt: true,
      payoutDate: true,
      createdAt: true,
      updatedAt: true,
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
    workLoacationId,
    workingPeriod,
  } = req.body;

  if (!contractCombinationId || !workLoacationId || !workingPeriod) {
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

  const workLocation = await prisma.employerLocationDetails.findFirst({
    where: { id: workLoacationId, isDeleted: false },
  });
  if (!workLocation) {
    return res.respond(404, "Work location not found!");
  }

  const ruleBook = await prisma.contractCombinationRuleBook.create({
    data: {
      contractCombinationId,
      workLoacationId,
      workingPeriod,
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

  if (!contractCombinationId) {
    return res.respond(400, "contractCombinationId is required!");
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

  const ruleBooks = await prisma.contractCombinationRuleBook.findMany({
    where: {
      isDeleted: false,
      contractCombinationId,
    },
   select: {
      id: true,
      workingPeriod: true,
      workLoacationId: true,
      createdAt: true,
      updatedAt: true,
      workLocation: true,
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
