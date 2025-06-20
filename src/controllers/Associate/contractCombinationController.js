const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { generateUniqueContractCombinationId, generateUniqueRuleBookId } = require("../../../utils/uniqueCodeGenerator");

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
  if (!ERM) {
    return res.respond(403, "associate subadmin not found!");
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

  const uniqueId = await generateUniqueContractCombinationId(employer.employerId);

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
  const { employerId } = req.params;

  if (!employerId) {
    return res.respond(400, "employerId is required!");
  }

  const ERM = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });
  if (!ERM) {
    return res.respond(403, "associate subadmin not found!");
  }

  const employer = await prisma.employer.findFirst({
    where: { id: employerId, isDeleted: false },
  });
  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  const combinations = await prisma.employerContractTypeCombination.findMany({
    where: {
      isDeleted: false,
      employerId,
    },
    include: {
      contractType: {
        include: {
          contractType: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      },
      _count: {
        select: {
          ContractCombinationRuleBook: {
            where: { isDeleted: false },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formatted = combinations.map((item) => ({
    id: item.id,
    uniqueId: item.uniqueId,
    triggerNextMonth: item.triggerNextMonth,
    accuralStartAt: item.accuralStartAt,
    accuralEndAt: item.accuralEndAt,
    payoutDate: item.payoutDate,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    contractType: item.contractType?.contractType || null,
    noOfRules: item._count.ContractCombinationRuleBook,
  }));

  res.respond(200, "Contract Combinations fetched successfully!", formatted);
});

// ##########----------Get Contract Combinations By Employer Contract Type----------##########
const getContractCombinationsByContractType = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { contractTypeId } = req.params;

  if (!contractTypeId) {
    return res.respond(400, "contractTypeId is required!");
  }

  const ERM = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });
  if (!ERM) {
    return res.respond(403, "associate subadmin not found!");
  }

  const contractType = await prisma.employerContractType.findFirst({
    where: { id: contractTypeId, isDeleted: false },
  });
  if (!contractType) {
    return res.respond(404, "contractType not found!");
  }

  const combinations = await prisma.employerContractTypeCombination.findMany({
    where: {
      isDeleted: false,
      contractTypeId,
    },
    orderBy: { createdAt: "desc" },
  });

  res.respond(200, "Contract Combinations fetched successfully!", combinations);
});

// ##########----------Get Single Contract Combination----------##########
const getSingleContractCombination = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { combinationId } = req.params;

  if (!combinationId) {
    return res.respond(400, "combinationId is required!");
  }

  const ERM = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });
  if (!ERM) {
    return res.respond(403, "associate subadmin not found!");
  }

  const combination = await prisma.employerContractTypeCombination.findFirst({
    where: {
      id: combinationId,
      isDeleted: false,
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
      ContractCombinationRuleBook: {
        select: {
          id: true,
          workingPeriod: true,
          workLocation: {
            select: {
              id: true,
              workspaceName: true,
              noOfEmployees: true,
              address: true,
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!combination) {
    return res.respond(404, "Contract Combination not found!");
  }

  res.respond(200, "Contract Combination fetched successfully!", combination);
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
  if (!ERM) {
    return res.respond(403, "associate subadmin not found!");
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

  const ruleBookId = await generateUniqueRuleBookId(prisma, contractCombination.uniqueId);

  const ruleBook = await prisma.contractCombinationRuleBook.create({
    data: {
      ruleBookId,
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
  if (!ERM) {
    return res.respond(403, "associate subadmin not found!");
  }

  const ruleBooks = await prisma.contractCombinationRuleBook.findMany({
    where: {
      isDeleted: false,
      contractCombinationId,
    },
    select: {
      id: true,
      ruleBookId: true,
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

// ##########----------Get Employer Work Locations----------##########
const getWorkLocationsByEmployerId = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { employerId } = req.query;

  if (!employerId) {
    return res.respond(400, "employerId is required!");
  }

  const ERM = await prisma.associateSubAdmin.findFirst({
    where: { userId, isDeleted: false },
    include: {
      role: true,
    },
  });
  if (!ERM) {
    return res.respond(403, "associate subadmin not found!");
  }
  const workLocations = await prisma.employerLocationDetails.findMany({
    where: {
      isDeleted: false,
      employerId: employerId,
    },
    select: {
      id: true,
      workspaceName: true,
      noOfEmployees: true,
      address: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.respond(200, "Employer Work Locations fetched successfully!", workLocations);
});

module.exports = {
  createContractCombination,
  getContractCombinations,
  getContractCombinationsByContractType,
  getSingleContractCombination,
  createContractRuleBook,
  getContractRuleBooks,
  getWorkLocationsByEmployerId
};
