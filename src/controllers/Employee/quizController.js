const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Get Daily Random Quiz Question----------##########
const getDailyQuizQuestion = asyncHandler(async (req, res) => {
    const userId = req.user;

    const employee = await prisma.employee.findUnique({
        where: { userId }
    });
    if (!employee) {
        return res.respond(404, "Customer not found!");
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayResponse = await prisma.employeeQuizResponse.findFirst({
        where: {
            employeeId: employee.id,
            answeredAt: {
                gte: todayStart,
                lte: todayEnd
            }
        }
    });

    if (todayResponse) {
        return res.respond(200, "You have already answered today's quiz!", {
            hasAnsweredToday: true,
            canAnswerAgainAt: todayEnd
        });
    }

    const answeredQuestions = await prisma.employeeQuizResponse.findMany({
        where: { employeeId: employee.id },
        select: { quizQuestionId: true }
    });

    const answeredQuestionIds = answeredQuestions.map(q => q.quizQuestionId);

    let randomQuestion = await prisma.quizQuestion.findFirst({
        where: {
            isDeleted: false,
            id: {
                notIn: answeredQuestionIds
            }
        },
        include: {
            quizCategory: true,
            QuizAnswer: {
                where: { isDeleted: false },
                orderBy: { createdAt: 'asc' }
            }
        },
    });

    if (!randomQuestion) {
        const allQuestions = await prisma.quizQuestion.findMany({
            where: { isDeleted: false },
            include: {
                quizCategory: true,
                QuizAnswer: {
                    where: { isDeleted: false },
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (allQuestions.length === 0) {
            return res.respond(404, "No quiz questions available!");
        }

        const randomIndex = Math.floor(Math.random() * allQuestions.length);
        randomQuestion = allQuestions[randomIndex];
    }

    res.respond(200, "Daily quiz question fetched successfully!", {
        hasAnsweredToday: false,
        question: randomQuestion
    });
});

// ##########----------Submit Quiz Answer----------##########
const submitQuizAnswer = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { quizQuestionId, quizAnswerId } = req.body;

    if (!quizQuestionId || !quizAnswerId) {
        return res.respond(400, "Question ID and Answer ID are required!");
    }

    const employee = await prisma.employee.findUnique({
        where: { userId }
    });
    if (!employee) {
        return res.respond(404, "Customer not found!");
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayResponse = await prisma.employeeQuizResponse.findFirst({
        where: {
            employeeId: employee.id,
            answeredAt: {
                gte: todayStart,
                lte: todayEnd
            }
        }
    });
    if (todayResponse) {
        return res.respond(400, "You have already answered today's quiz!");
    }

    const question = await prisma.quizQuestion.findUnique({
        where: { id: quizQuestionId }
    });
    if (!question) {
        return res.respond(404, "Quiz question not found!");
    }

    const answer = await prisma.quizAnswer.findUnique({
        where: { id: quizAnswerId }
    });
    if (!answer) {
        return res.respond(404, "Quiz answer not found!")
    }

    if (answer.quizQuestionId !== quizQuestionId) {
        return res.respond(400, "Answer does not belong to this question!");
    }

    const result = await prisma.$transaction(async (tx) => {
        const quizResponse = await tx.employeeQuizResponse.create({
            data: {
                employeeId: employee.id,
                quizQuestionId,
                quizAnswerId,
                pointsEarned: answer.point
            },
            include: {
                quizQuestion: {
                    include: {
                        quizCategory: true
                    }
                },
                quizAnswer: true
            }
        });

        const updatedEmployee = await tx.employee.update({
            where: { id: employee.id },
            data: {
                totalQuizPoints: {
                    increment: answer.point
                }
            }
        });

        return { quizResponse, updatedEmployee };
    });

    res.respond(201, "Quiz answer submitted successfully!", {
        response: result.quizResponse,
        pointsEarned: answer.point,
        totalPoints: result.updatedEmployee.totalQuizPoints
    });
});

// ##########----------Get Employee Quiz Stats----------##########
const getEmployeeQuizStats = asyncHandler(async (req, res) => {
   const userId = req.user;

    const employee = await prisma.employee.findUnique({
        where: { userId },
        select: {
            id: true,
            employeeName: true,
            totalQuizPoints: true
        }
    });

    if (!employee) {
        return res.respond(404, "Employee not found!");
    }

    res.respond(200, "Total points fetched successfully!", {
        employeeId: employee.id,
        employeeName: employee.employeeName,
        totalPoints: employee.totalQuizPoints
    });
});

// ##########----------Get All Quiz Categories with Progress----------##########
const getQuizCategoriesWithProgress = asyncHandler(async (req, res) => {
    const userId = req.user;

    const employee = await prisma.employee.findUnique({
        where: { userId: userId }
    });
    if (!employee) {
        return res.respond(404, "Employee not found!");
    }

    const categories = await prisma.quizCategory.findMany({
        where: { isDeleted: false },
        include: {
            QuizQuestion: {
                where: { isDeleted: false },
                select: { id: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    const answeredQuestions = await prisma.employeeQuizResponse.findMany({
        where: { employeeId: employee.id },
        include: {
            quizQuestion: {
                select: {
                    quizCategoryId: true
                }
            }
        }
    });

    const categoriesWithProgress = categories.map(category => {
        const totalQuestions = category.QuizQuestion.length;

        const answeredInCategory = answeredQuestions.filter(
            aq => aq.quizQuestion?.quizCategoryId === category.id
        );

        const answeredCount = answeredInCategory.length;
        const pointsEarned = answeredInCategory.reduce(
            (sum, aq) => sum + aq.pointsEarned, 0
        );

        const progressPercentage = totalQuestions > 0
            ? Math.round((answeredCount / totalQuestions) * 100)
            : 0;

        return {
            id: category.id,
            name: category.name,
            totalQuestions,
            answeredQuestions: answeredCount,
            remainingQuestions: totalQuestions - answeredCount,
            pointsEarned,
            progressPercentage,
            isCompleted: answeredCount === totalQuestions && totalQuestions > 0
        };
    });

    res.respond(200, "Quiz categories fetched successfully!", categoriesWithProgress);
});

// ##########----------Get Questions by Category----------##########
const getQuestionsByCategory = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { categoryId } = req.params;
    const { filterUnanswered = 'false' } = req.query;

    const employee = await prisma.employee.findUnique({
        where: { userId: userId }
    });
    if (!employee) {
        return res.respond(404, "Employee not found!");
    }

    const category = await prisma.quizCategory.findUnique({
        where: { id: categoryId }
    });

    if (!category) {
        return res.respond(404, "Quiz category not found!");
    }

    const answeredQuestions = await prisma.employeeQuizResponse.findMany({
        where: { employeeId: employee.id },
        select: { quizQuestionId: true }
    });

    const answeredQuestionIds = answeredQuestions.map(aq => aq.quizQuestionId);

    const whereClause = {
        quizCategoryId: categoryId,
        isDeleted: false
    };

    if (filterUnanswered === 'true') {
        whereClause.id = {
            notIn: answeredQuestionIds
        };
    }

    const questions = await prisma.quizQuestion.findMany({
        where: whereClause,
        include: {
            quizCategory: true,
            QuizAnswer: {
                where: { isDeleted: false },
                orderBy: { createdAt: 'asc' }
            }
        },
        orderBy: { createdAt: 'asc' }
    });

    const questionsWithStatus = questions.map(question => ({
        ...question,
        isAnswered: answeredQuestionIds.includes(question.id),
        canAnswer: !answeredQuestionIds.includes(question.id)
    }));

    res.respond(200, "Questions fetched successfully!", {
        category: {
            id: category.id,
            name: category.name
        },
        totalQuestions: questionsWithStatus.length,
        questions: questionsWithStatus
    });
});

// ##########----------Get Single Question by ID----------##########
const getQuestionById = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { questionId } = req.params;

    const employee = await prisma.employee.findUnique({
        where: { userId: userId }
    });

    if (!employee) {
        return res.respond(404, "Employee not found!");
    }

    const question = await prisma.quizQuestion.findUnique({
        where: { id: questionId },
        include: {
            quizCategory: true,
            QuizAnswer: {
                where: { isDeleted: false },
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!question) {
        return res.respond(404, "Question not found!");
    }

    const existingResponse = await prisma.employeeQuizResponse.findFirst({
        where: {
            employeeId: employee.id,
            quizQuestionId: questionId
        },
        include: {
            quizAnswer: true
        }
    });

    res.respond(200, "Question fetched successfully!", {
        question,
        isAnswered: !!existingResponse,
        canAnswer: !existingResponse,
        previousAnswer: existingResponse ? {
            answerId: existingResponse.quizAnswerId,
            answer: existingResponse.quizAnswer?.answer,
            pointsEarned: existingResponse.pointsEarned,
            answeredAt: existingResponse.answeredAt
        } : null
    });
});

const submitCategoryQuizAnswer = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { quizQuestionId, quizAnswerId } = req.body;

    if (!quizQuestionId || !quizAnswerId) {
        return res.respond(400, "Question ID and Answer ID are required!");
    }

    const employee = await prisma.employee.findUnique({
        where: { userId: userId }
    });

    if (!employee) {
        return res.respond(404, "Employee not found!");
    }

    const existingResponse = await prisma.employeeQuizResponse.findFirst({
        where: {
            employeeId: employee.id,
            quizQuestionId: quizQuestionId
        }
    });

    if (existingResponse) {
        return res.respond(400, "You have already answered this question!");
    }

    const question = await prisma.quizQuestion.findUnique({
        where: { id: quizQuestionId },
        include: {
            quizCategory: true
        }
    });

    if (!question) {
        return res.respond(404, "Quiz question not found!");
    }

    const answer = await prisma.quizAnswer.findUnique({
        where: { id: quizAnswerId }
    });

    if (!answer) {
        return res.respond(404, "Quiz answer not found!");
    }

    if (answer.quizQuestionId !== quizQuestionId) {
        return res.respond(400, "Answer does not belong to this question!");
    }

    const result = await prisma.$transaction(async (tx) => {
        const quizResponse = await tx.employeeQuizResponse.create({
            data: {
                employeeId: employee.id,
                quizQuestionId,
                quizAnswerId,
                pointsEarned: answer.point
            },
            include: {
                quizQuestion: {
                    include: {
                        quizCategory: true
                    }
                },
                quizAnswer: true
            }
        });

        const updatedEmployee = await tx.employee.update({
            where: { id: employee.id },
            data: {
                totalQuizPoints: {
                    increment: answer.point
                }
            }
        });

        return { quizResponse, updatedEmployee };
    });

    res.respond(201, "Quiz answer submitted successfully!", {
        response: result.quizResponse,
        pointsEarned: answer.point,
        totalPoints: result.updatedEmployee.totalQuizPoints,
        category: result.quizResponse.quizQuestion.quizCategory
    });
});

module.exports = {
    getDailyQuizQuestion,
    submitQuizAnswer,
    getEmployeeQuizStats,
    getQuizCategoriesWithProgress,
    getQuestionsByCategory,
    getQuestionById,
    submitCategoryQuizAnswer
};