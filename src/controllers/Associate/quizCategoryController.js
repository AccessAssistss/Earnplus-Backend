const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Create Quiz Category----------##########
const createQuizCategory = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.respond(400, "Quiz Category name is required!");
    }

    const quizCategoryExists = await prisma.quizCategory.findFirst({
        where: { name, isDeleted: false }
    });

    if (quizCategoryExists) {
        return res.respond(400, "Quiz Category already exists!");
    }

    const category = await prisma.quizCategory.create({
        data: { name }
    });

    res.respond(201, "Quiz Category created successfully!", category);
});

// ##########----------Get All Quiz Categories----------##########
const getAllQuizCategories = asyncHandler(async (req, res) => {
    const categories = await prisma.quizCategory.findMany({
        orderBy: { createdAt: 'desc' }
    });

    res.respond(200, "Quiz Categories fetched successfully!", categories);
});

// ##########----------Get Single Quiz Category----------##########
const getQuizCategoryById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await prisma.quizCategory.findUnique({
        where: { id }
    });

    if (!category) {
        return res.respond(404, "Quiz Category not found!");
    }

    res.respond(200, "Quiz Category fetched successfully!", category);
});

// ##########----------Get Single Quiz Category----------##########
const updateQuizCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
        return res.respond(400, "Quiz Category name is required!");
    }

    const categoryExists = await prisma.quizCategory.findUnique({
        where: { id }
    });

    if (!categoryExists) {
        return res.respond(404, "Quiz Category not found!");
    }

    const duplicateCategory = await prisma.quizCategory.findFirst({
        where: {
            name,
            NOT: { id }
        }
    });

    if (duplicateCategory) {
        return res.respond(400, "Quiz Category with this name already exists!");
    }

    const category = await prisma.quizCategory.update({
        where: { id },
        data: { name }
    });

    res.respond(200, "Quiz Category updated successfully!", category);
});

// ##########----------Delete Quiz Category----------##########
const deleteQuizCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const categoryExists = await prisma.quizCategory.findFirst({
        where: { id, isDeleted: false }
    });

    if (!categoryExists) {
        return res.respond(404, "Quiz Category not found!");
    }

    await prisma.quizCategory.update({
        where: { id },
        data: { isDeleted: true }
    });

    res.respond(200, "Quiz Category deleted successfully!");
});

module.exports = {
    createQuizCategory,
    getAllQuizCategories,
    getQuizCategoryById,
    updateQuizCategory,
    deleteQuizCategory
}