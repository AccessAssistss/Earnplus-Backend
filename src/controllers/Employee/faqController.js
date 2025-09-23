const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient()

const createFaq = asyncHandler(async (req, res) => {
    const { screenName, question, answer } = req.body;

    if (!screenName || !question || !answer) {
        return res.respond(400, "All fields Required!")
    }

    const faq = await prisma.faq.create({
        data: {
            screenName,
            question,
            answer
        }
    });

    res.respond(201, "Faq Created Successfully!", faq)
});

const getAllFaqs = asyncHandler(async (req, res) => {
    const { screenName } = req.query;

    const faqs = await prisma.faq.findMany({
        where: { screenName }
    })

    res.respond(200, "Faqs fetched successfully!", faqs)
})

module.exports = {
    createFaq,
    getAllFaqs
}