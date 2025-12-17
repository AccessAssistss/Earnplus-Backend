const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { camsAuthentication, camsAARedirection } = require("../../../utils/proxyUtils");

const prisma = new PrismaClient();

// ##########----------Create AA Redirection----------##########
const createAARedirection = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { phone } = req.body;

    if (!loanApplicationId) return res.respond(400, "Loan Application Id is required.");
    if (!phone) return res.respond(400, "phone is required.");

    const user = await prisma.customUser.findFirst({
        where: { id: userId, isDeleted: false },
    });
    if (!user) return res.respond(404, "User not found.");

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");
    const authData = await camsAuthentication();

    const redirectionData = await camsAARedirection(loanApplication.id, phone, authData.sessionId, authData.token)

    res.respond(200, "Redirection Link Send successfully!");
});

module.exports = {
    createAARedirection,
};