const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Quiz Question CRUD----------##########
// ##########----------Create Quiz Question----------##########
const createQuizQuestion = asyncHandler(async (req, res) => {
    const { quizCategoryId, question } = req.body;

    if (!question) {
        return res.respond(400, "Question is required!");
    }

    if (quizCategoryId) {
        const categoryExists = await prisma.quizCategory.findUnique({
            where: { id: quizCategoryId }
        });

        if (!categoryExists) {
            return res.respond(404, "Quiz Category not found!");
        }
    }

    const quizQuestion = await prisma.quizQuestion.create({
        data: {
            quizCategoryId,
            question
        },
        include: {
            quizCategory: true
        }
    });

    res.respond(201, "Quiz Question created successfully!", quizQuestion);
});

// ##########----------Get All Quiz Questions----------##########
const getAllQuizQuestions = asyncHandler(async (req, res) => {
    const { quizCategoryId } = req.query;

    const where = quizCategoryId ? { quizCategoryId } : {};

    const questions = await prisma.quizQuestion.findMany({
        where,
        include: {
            quizCategory: true
        },
        orderBy: { createdAt: 'desc' }
    });

    res.respond(200, "Quiz Questions fetched successfully!", questions);
});

// ##########----------Get Single Quiz Question----------##########
const getQuizQuestionById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const question = await prisma.quizQuestion.findUnique({
        where: { id },
        include: {
            quizCategory: true
        }
    });

    if (!question) {
        return res.respond(404, "Quiz Question not found!");
    }

    res.respond(200, "Quiz Question fetched successfully!", question);
});

// ##########----------Update Quiz Question----------##########
const updateQuizQuestion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quizCategoryId, question } = req.body;

    if (!question) {
        return res.respond(400, "Question is required!");
    }

    const questionExists = await prisma.quizQuestion.findUnique({
        where: { id }
    });

    if (!questionExists) {
        return res.respond(404, "Quiz Question not found!");
    }

    if (quizCategoryId) {
        const categoryExists = await prisma.quizCategory.findUnique({
            where: { id: quizCategoryId }
        });

        if (!categoryExists) {
            return res.respond(404, "Quiz Category not found!");
        }
    }

    const updatedQuestion = await prisma.quizQuestion.update({
        where: { id },
        data: {
            quizCategoryId,
            question
        },
        include: {
            quizCategory: true
        }
    });

    res.respond(200, "Quiz Question updated successfully!", updatedQuestion);
});

// ##########----------Delete Quiz Question----------##########
const deleteQuizQuestion = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const questionExists = await prisma.quizQuestion.findFirst({
        where: { id, isDeleted: false }
    });

    if (!questionExists) {
        return res.respond(404, "Quiz Question not found!");
    }

    await prisma.quizQuestion.update({
        where: { id },
        data: { isDeleted: true }
    });

    res.respond(200, "Quiz Question deleted successfully!");
});

// ##########----------Quiz Answer CRUD----------##########
// ##########----------Create Quiz Answer----------##########
const createQuizAnswer = asyncHandler(async (req, res) => {
    const { quizQuestionId, answer, point } = req.body;

    if (!answer) {
        return res.respond(400, "Answer is required!");
    }

    if (point === undefined || point === null) {
        return res.respond(400, "Point is required!");
    }

    if (quizQuestionId) {
        const questionExists = await prisma.quizQuestion.findUnique({
            where: { id: quizQuestionId }
        });

        if (!questionExists) {
            return res.respond(404, "Quiz Question not found!");
        }
    }

    const quizAnswer = await prisma.quizAnswer.create({
        data: {
            quizQuestionId,
            answer,
            point
        },
        include: {
            quizQuestion: true
        }
    });

    res.respond(201, "Quiz Answer created successfully!", quizAnswer);
});

// ##########----------Get All Quiz Answers----------##########
const getAllQuizAnswers = asyncHandler(async (req, res) => {
    const { quizQuestionId } = req.query;

    const where = quizQuestionId ? { quizQuestionId } : {};

    const answers = await prisma.quizAnswer.findMany({
        where,
        include: {
            quizQuestion: true
        },
        orderBy: { createdAt: 'desc' }
    });

    res.respond(200, "Quiz Answers fetched successfully!", answers);
});

// ##########----------Get Single Quiz Answer----------##########
const getQuizAnswerById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const answer = await prisma.quizAnswer.findUnique({
        where: { id },
        include: {
            quizQuestion: true
        }
    });

    if (!answer) {
        return res.respond(404, "Quiz Answer not found!");
    }

    res.respond(200, "Quiz Answer fetched successfully!", answer);
});

// ##########----------Update Quiz Answer----------##########
const updateQuizAnswer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { quizQuestionId, answer, point } = req.body;

    if (!answer) {
        return res.respond(400, "Answer is required!");
    }

    if (point === undefined || point === null) {
        return res.respond(400, "Point is required!");
    }

    const answerExists = await prisma.quizAnswer.findUnique({
        where: { id }
    });

    if (!answerExists) {
        return res.respond(404, "Quiz Answer not found!");
    }

    if (quizQuestionId) {
        const questionExists = await prisma.quizQuestion.findUnique({
            where: { id: quizQuestionId }
        });

        if (!questionExists) {
            return res.respond(404, "Quiz Question not found!");
        }
    }

    const updatedAnswer = await prisma.quizAnswer.update({
        where: { id },
        data: {
            quizQuestionId,
            answer,
            point
        },
        include: {
            quizQuestion: true
        }
    });

    res.respond(200, "Quiz Answer updated successfully!", updatedAnswer);
});

// ##########----------Delete Quiz Answer----------##########
const deleteQuizAnswer = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const answerExists = await prisma.quizAnswer.findUnique({
        where: { id }
    });

    if (!answerExists) {
        return res.respond(404, "Quiz Answer not found!");
    }

    await prisma.quizAnswer.update({
        where: { id },
        data: { isDeleted: true }
    });

    res.respond(200, "Quiz Answer deleted successfully!");
});

module.exports = {
    createQuizQuestion,
    getAllQuizQuestions,
    getQuizQuestionById,
    updateQuizQuestion,
    deleteQuizQuestion,
    createQuizAnswer,
    getAllQuizAnswers,
    getQuizAnswerById,
    updateQuizAnswer,
    deleteQuizAnswer
};