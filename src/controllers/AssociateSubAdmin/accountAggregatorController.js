const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { camsAuthentication, camsAARedirection, camsGetConsentData, camsFetchPeriodicData } = require("../../../utils/proxyUtils");
const saveBase64Pdf = require("../../../utils/saveBase64Pdf");
const { formatDateForFile } = require("../../../utils/dateFormatter");

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

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    const authData = await camsAuthentication();

    const redirectionData = await camsAARedirection(loanApplication.id, phone, authData.data.sessionId, authData.data.token)

    await prisma.loanCamsData.upsert({
        where: {
            applicationId: loanApplication.id,
        },
        update: {
            sessionId: authData.data.sessionId,
        },
        create: {
            applicationId: loanApplication.id,
            sessionId: authData.data.sessionId,
        },
    });

    res.respond(200, "Redirection Link Send successfully!", { authData, redirectionData });
});

// ##########----------Get Consent Data----------##########
const getConsentData = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    if (!loanApplicationId) return res.respond(400, "Loan Application Id is required.");

    const user = await prisma.customUser.findFirst({
        where: { id: userId, isDeleted: false },
    });
    if (!user) return res.respond(404, "User not found.");

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
        include: {
            LoanCamsData: true,
        },
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    const authData = await camsAuthentication();

    const consentData = await camsGetConsentData(loanApplication.LoanCamsData.consentId, authData.data.token)

    res.respond(200, "Consent Data Fetched Successfully!", consentData);
});

// ##########----------Get Consent Data----------##########
const fetchPeriodicData = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;

    if (!loanApplicationId) return res.respond(400, "Loan Application Id is required.");

    const user = await prisma.customUser.findFirst({
        where: { id: userId, isDeleted: false },
    });
    if (!user) return res.respond(404, "User not found.");

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
        include: {
            LoanCamsData: true,
        },
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    const authData = await camsAuthentication();

    const consentData = await camsFetchPeriodicData(loanApplication.LoanCamsData.sessionId, loanApplication.LoanCamsData.txnId, loanApplication.LoanCamsData.consentId, authData.data.token)

    const timestamp = formatDateForFile();

    const pdfPath = saveBase64Pdf(
        consentData.dataDetail.pdfbase64,
        "loan",
        "statements/six_month",
        `six_month_${loanApplication.id}_${timestamp}`
    );

    await prisma.loanCreditData.upsert({
        where: {
            applicationId: loanApplication.id,
        },
        update: {
            lastSixMonthStatementPdf: pdfPath,
            statementJson: consentData.dataDetail.jsonData,
        },
        create: {
            applicationId: loanApplication.id,
            lastSixMonthStatementPdf: pdfPath,
            statementJson: consentData.dataDetail.jsonData,
        },
    });

    res.respond(200, "Consent Data Fetched Successfully!", consentData);
});

// ##########----------Webhook Handler----------##########
const webhookHandler = asyncHandler(async (req, res) => {
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== "epcmaawh") {
        return res.respond(401, "Unauthorized webhook");
    }
    const body = req.body;
    if (!body.purpose) {
        return res.respond(400, "Invalid webhook payload");
    }

    if (body.purpose === "ConsentStatusNotification") {
        if (body.Fetchtype === "PERIODIC" && body.Frequency === "5 times a MONTH")
            await prisma.loanCamsData.upsert({
                where: {
                    applicationId: body.clienttxnid,
                },
                update: {
                    consentId: body.ConsentStatusNotification.consentid,
                    txnid: body.txnid
                },
                create: {
                    applicationId: body.clienttxnid,
                    consentId: body.ConsentStatusNotification.consentid,
                    txnid: body.txnid
                },
            });
    }

    if (body.purpose === "Push_Data") {
        const timestamp = formatDateForFile();
        const pdfPath = saveBase64Pdf(
            body.dataDetail.pdfbase64,
            "loan",
            "statements/one_year",
            `one_year_${body.clienttxnid}_${timestamp}`
        );

        await prisma.loanCreditData.upsert({
            where: {
                applicationId: body.clienttxnid,
            },
            update: {
                lastOneYearStatementPdf: pdfPath,
                statementJson: body.dataDetail.jsonData,
            },
            create: {
                applicationId: body.clienttxnid,
                lastOneYearStatementPdf: pdfPath,
                statementJson: body.dataDetail.jsonData,
            },
        });
    }

    return res.respond(200, "Success!");
});

module.exports = {
    createAARedirection,
    getConsentData,
    fetchPeriodicData,
    webhookHandler
};