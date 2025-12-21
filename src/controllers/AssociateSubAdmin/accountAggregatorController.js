const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { camsAuthentication, camsAARedirection, camsGetConsentData, camsFetchPeriodicData } = require("../../../utils/proxyUtils");
const { saveJsonResponse } = require("../../../utils/jsonResopnseSaver");

const prisma = new PrismaClient();

// ##########----------Create AA Redirection----------##########
const createAARedirection = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { phone } = req.body;

    if (!loanApplicationId) return res.respond(400, "Loan Application Id is required.");
    if (!phone) return res.respond(400, "phone is required.");

    const user = await prisma.customUser.findFirst({
        where: { id: userId },
    });
    if (!user) return res.respond(404, "User not found.");

    // const loanApplication = await prisma.loanApplication.findUnique({
    //     where: { id: loanApplicationId },
    // });
    // if (!loanApplication) return res.respond(404, "Loan Application not found.");
    const authData = await camsAuthentication();

    const redirectionData = await camsAARedirection(loanApplicationId, phone, authData.data.sessionId, authData.data.token)

    res.respond(200, "Redirection Link Send successfully!", { authData, redirectionData });
});

// ##########----------Get Consent Data----------##########
const getConsentData = asyncHandler(async (req, res) => {
    const { consentId, token } = req.body;
    // const userId = req.user;
    // const { loanApplicationId } = req.params;
    // const { phone } = req.body;

    // if (!loanApplicationId) return res.respond(400, "Loan Application Id is required.");
    // if (!phone) return res.respond(400, "phone is required.");

    // const user = await prisma.customUser.findFirst({
    //     where: { id: userId, isDeleted: false },
    // });
    // if (!user) return res.respond(404, "User not found.");

    // const loanApplication = await prisma.loanApplication.findUnique({
    //     where: { id: loanApplicationId },
    // });
    // if (!loanApplication) return res.respond(404, "Loan Application not found.");
    // const authData = await camsAuthentication();

    const consentData = await camsGetConsentData(consentId, token)
    await saveJsonResponse(
        "consent-data",
        `consent_${consentId}_${Date.now()}`,
        consentData
    );

    res.respond(200, "Consent Data Fetched Successfully!", consentData);
});

// ##########----------Get Consent Data----------##########
const fetchPeriodicData = asyncHandler(async (req, res) => {
    const { sessionId, txnId, consentId, token } = req.body;
    // const userId = req.user;
    // const { loanApplicationId } = req.params;
    // const { phone } = req.body;

    // if (!loanApplicationId) return res.respond(400, "Loan Application Id is required.");
    // if (!phone) return res.respond(400, "phone is required.");

    // const user = await prisma.customUser.findFirst({
    //     where: { id: userId, isDeleted: false },
    // });
    // if (!user) return res.respond(404, "User not found.");

    // const loanApplication = await prisma.loanApplication.findUnique({
    //     where: { id: loanApplicationId },
    // });
    // if (!loanApplication) return res.respond(404, "Loan Application not found.");
    // const authData = await camsAuthentication();

    const consentData = await camsFetchPeriodicData(sessionId, txnId, consentId, token)
    await saveJsonResponse(
        "periodic-data",
        `periodic_${sessionId}_${txnId}_${Date.now()}`,
        consentData.data
    );

    res.respond(200, "Consent Data Fetched Successfully!", consentData);
});

// ##########----------Webhook Handler----------##########
const webhookHandler = asyncHandler(async (req, res) => {
    const apiKey = req.headers["x-api-key"];

    if (apiKey !== "epcmaawh") {
        return res.respond(401, "Unauthorized webhook");
    }

    const body = req.body;
    const txnId = req.body.clienttxnid || req.body.clientTxnId || "UNKNOWN";
    const timestamp = Date.now();

    if (!body.purpose) {
        return res.respond(400, "Invalid webhook payload");
    }

    if (body.purpose === "ConsentStatusNotification") {
        await saveJsonResponse(
            "webhook-consent-data",
            `webhook_consent_${txnId}_${timestamp}`,
            body
        );
    }

    if (body.purpose === "Push_Data") {
        await saveJsonResponse(
            "webhook-push-data",
            `webhook_push_${txnId}_${timestamp}`,
            body
        );
    }

    return res.respond(200, "Success!");
});

module.exports = {
    createAARedirection,
    getConsentData,
    fetchPeriodicData,
    webhookHandler
};