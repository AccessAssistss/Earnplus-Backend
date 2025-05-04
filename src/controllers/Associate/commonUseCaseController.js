const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------Common UseCase--------------------####################
// ##########----------Create Common UseCase----------##########
const createCommonUseCase = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.respond(400, "Common UseCase is required!");
  }

  const existingCommonUseCase = await prisma.commonUseCase.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
    },
  });

  if (existingCommonUseCase) {
    return res.respond(400, "Common UseCase with this name already exists!");
  }

  const createCommonUseCase = await prisma.commonUseCase.create({
    data: { name },
  });

  res.respond(201, "Common UseCase Created Successfully!", createCommonUseCase);
});

// ##########----------Update Common UseCase----------##########
const updateCommonUseCase = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { useCaseId } = req.params;

  if (!name) {
    return res.respond(400, "Common UseCase is required!");
  }

  const existingCommonUseCase = await prisma.commonUseCase.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      NOT: {
        id: useCaseId,
      },
    },
  });

  if (existingCommonUseCase) {
    return res.respond(400, "Common UseCase with this name already exists!");
  }

  const updatedCommonUseCase = await prisma.commonUseCase.update({
    where: { id: req.params.useCaseId },
    data: { name },
  });

  res.respond(200, "Common UseCase Updated Successfully!", updatedCommonUseCase);
});

// ##########----------Get All Common UseCases----------##########
const getAllCommonUseCases = asyncHandler(async (req, res) => {
  const commonUseCases = await prisma.commonUseCase.findMany({
    where: { isDeleted: false },
    orderBy: { name: "asc" },
  });

  res.respond(200, "Common UseCases fetched Successfully!", commonUseCases);
});

// ##########----------Soft Delete Country----------##########
const softDeleteCommonUseCase = asyncHandler(async (req, res) => {
  const { useCaseId } = req.params;

  const deletedCommonUseCase = await prisma.commonUseCase.update({
    where: { id: useCaseId },
    data: { isDeleted: true },
  });

  res.respond(
    200,
    "Common UseCase deleted(Soft Delete) Successfully!",
    deletedCommonUseCase
  );
});

module.exports = {
  createCommonUseCase,
  updateCommonUseCase,
  getAllCommonUseCases,
  softDeleteCommonUseCase,
};
