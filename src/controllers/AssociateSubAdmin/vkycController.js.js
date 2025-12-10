const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { createVKYCLink, GetVKYCStatusByUniqueId, GetVKYCDetailsBySessionId } = require("../../../utils/proxyUtils");

const prisma = new PrismaClient();

// ##########----------Create VKYC Link For Customer----------##########
const createVKYCLinkForCustomer = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { firstName, lastName, mobile, email } = req.body;

    if (!loanApplicationId) return res.respond(400, "Loan Application Id is required.");
    if (!firstName || !lastName || !mobile || !email) return res.respond(400, "firstName, lastName, mobile and email are required fields.");

    const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!associateSubAdmin) return res.respond(404, "Associate SubAdmin not found.");

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    const vkycLink = await createVKYCLink(firstName, lastName, loanId = loanApplication.id, mobile, email, preferredAgentEmailId = associateSubAdmin.email)

    res.respond(200, "VKYC Link Created Successfully!");
});

// ##########----------Get VKYC Data Point Details Of Customer----------##########
const getVKYCDataPointDetails = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    if (!loanApplicationId) return res.respond(400, "Loan Application Id is required.");

    const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false },
    });
    if (!associateSubAdmin) return res.respond(404, "Associate SubAdmin not found.");

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    const vkycStatus = await GetVKYCStatusByUniqueId(loanApplication.id);
    if (!vkycStatus.success || !vkycStatus.data.data) {
        return res.respond(400, "Unable   to fetch VKYC Status");
    }

    const sessionId = Object.keys(vkycStatus.data.data)[0];
    if (!sessionId) {
        return res.respond(404, "Session ID not found in VKYC status response.");
    }

    const vkycDetails = await GetVKYCDetailsBySessionId([sessionId]);

    res.respond(200, "VKYC Details fetched Successfully!", vkycDetails.data.data);
});

module.exports = {
    createVKYCLinkForCustomer,
    getVKYCDataPointDetails
};