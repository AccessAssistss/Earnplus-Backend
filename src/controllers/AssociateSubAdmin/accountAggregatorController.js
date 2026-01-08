const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { camsAuthentication, camsAARedirection, camsGetConsentData, camsFetchPeriodicData } = require("../../../utils/proxyUtils");
const saveBase64Pdf = require("../../../utils/saveBase64Pdf");
const { formatDateForFile } = require("../../../utils/dateFormatter");
const { generateClientTxnId } = require("../../../utils/uniqueCodeGenerator");
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

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
        include: { LoanCamsData: true }
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    if (loanApplication.LoanCamsData?.status === "CONSENT_RECEIVED") {
        return res.respond(400, "Consent already received");
    }

    const clienttxnid = generateClientTxnId(loanApplicationId);

    const authData = await camsAuthentication();

    const redirectionData = await camsAARedirection(clienttxnid, phone, authData.data.sessionId, authData.data.token)

    await prisma.loanCamsData.upsert({
        where: {
            applicationId: loanApplication.id,
        },
        update: {
            clienttxnid,
            sessionId: authData.data.sessionId,
            redirectionUrl: redirectionData.data.data.redirectionurl,
            status: "LINK_GENERATED",
        },
        create: {
            applicationId: loanApplication.id,
            clienttxnid,
            sessionId: authData.data.sessionId,
            redirectionUrl: redirectionData.data.data.redirectionurl,
            status: "LINK_GENERATED",
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
        where: { id: userId },
    });
    if (!user) return res.respond(404, "User not found.");

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
        include: {
            LoanCamsData: true,
        },
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    if (!loanApplication.LoanCamsData?.consentId) {
        return res.respond(400, "Consent not yet initiated");
    }

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
        where: { id: userId },
    });
    if (!user) return res.respond(404, "User not found.");

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
        include: {
            LoanCamsData: true,
        },
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    const cams = loanApplication.LoanCamsData;

    if (!cams?.consentId || !cams?.sessionId || !cams?.txnId) {
        return res.respond(400, "Customer consent is pending.");
    }

    const authData = await camsAuthentication();

    const response = await camsFetchPeriodicData(
        cams.sessionId,
        cams.txnId,
        cams.consentId,
        authData.data.token
    );
    console.log(response)

    if (!response?.success) {
        return res.respond(
            response?.data?.statusCode || 502,
            "Failed to submit FI request to CAMS."
        );
    }

    if (response.data?.statusCode != "200") {
        return res.respond(
            400,
            response.data?.message || "CAMS rejected FI request."
        );
    }

    res.respond(200, "Periodic data fetch initiated. Bank data will be received via webhook.", response);
});

// ##########----------Webhook Handler----------##########
const webhookHandler = asyncHandler(async (req, res) => {
    if (req.headers["x-api-key"] !== "epcmaawh") {
        console.warn("Invalid webhook key");
    }

    const body = req.body;

    const timestamps = formatDateForFile()

    saveJsonResponse("Account Aggregator", timestamps, body)
    if (!body?.purpose) {
        return res.respond(400, "Invalid webhook payload");
    }

    if (body.purpose === "ConsentStatusNotification") {
        if (body.Fetchtype === "PERIODIC" && body.Frequency === "5 times a MONTH") {
            await prisma.loanCamsData.updateMany({
                where: { clienttxnid: body.clienttxnid },
                data: {
                    consentId: body.ConsentStatusNotification?.consentId,
                    txnId: body.txnid,
                    status:
                        body.ConsentStatusNotification?.consentStatus === "ACTIVE"
                            ? "CONSENT_RECEIVED"
                            : "CONSENT_FAILED",
                },
            });
        }
    }

    if (body.purpose === "Push_Data") {
        const camsData = await prisma.loanCamsData.findUnique({
            where: { clienttxnid: body.clienttxnid }
        });
        if (!camsData) {
            console.warn("CAMS webhook ignored:", body.clienttxnid);
            return res.respond(200, "Ignored");
        }

        const creditData = await prisma.loanCreditData.findUnique({
            where: { applicationId: camsData.applicationId }
        });

        const timestamp = formatDateForFile();

        const updateData = {
            statementJson: body.dataDetail.jsonData
        };

        if (!creditData?.lastOneYearStatementPdf) {
            updateData.lastOneYearStatementPdf = saveBase64Pdf(
                body.dataDetail.pdfbase64,
                "loan",
                "statements/one_year",
                `one_year_${camsData.applicationId}_${timestamp}`
            );
        }
        else {
            updateData.lastSixMonthStatementPdf = saveBase64Pdf(
                body.dataDetail.pdfbase64,
                "loan",
                "statements/six_month",
                `six_month_${camsData.applicationId}_${timestamp}`
            );
        }

        await prisma.loanCreditData.upsert({
            where: { applicationId: camsData.applicationId },
            update: updateData,
            create: {
                applicationId: camsData.applicationId,
                ...updateData
            }
        });
    }

    if (body.purpose === "Processed_Data") {
        // const timestamp = formatDateForFile();
        // const pdfPath = saveBase64Pdf(
        //     body.dataDetail.pdfbase64,
        //     "loan",
        //     "bsa_data",
        //     `one_year_${body.clienttxnid}_${timestamp}`
        // );

        const camsData = await prisma.loanCamsData.findUnique({
            where: { clienttxnid: body.clienttxnid }
        });
        if (!camsData) {
            console.warn("CAMS webhook ignored:", body.clienttxnid);
            return res.respond(200, "Ignored");
        }

        await prisma.loanCreditData.upsert({
            where: { applicationId: camsData.applicationId },
            update: { bsaJson: body },
            create: {
                applicationId: camsData.applicationId,
                bsaJson: body,
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