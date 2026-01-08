const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { createEsignRequest, fetchDocumentDetails } = require("../../../utils/proxyUtils");
const { formatDateForFile } = require("../../../utils/dateFormatter");
const saveBase64Pdf = require("../../../utils/saveBase64Pdf");
const { htmlToBase64Pdf } = require("../../../utils/saveBase64Html");
const { injectTemplate } = require("../../../utils/templateInjector");
const { resolveContext } = require("../../../utils/agreementResolver");
const { buildAgreementContext } = require("../../../utils/agreementContext");
const { saveJsonResponse } = require("../../../utils/jsonResopnseSaver");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

// ##########----------Send E-Sign Documents To Customer----------##########
const sendEsignDocumentToCustomer = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { templateId } = req.body;

    if (!loanApplicationId) return res.respond(400, "Loan Application Id is required.");

    if (!templateId) {
        return res.respond(400, "Agreement Template Id is required.");
    }

    const user = await prisma.customUser.findFirst({
        where: { id: userId },
    });
    if (!user) return res.respond(404, "User not found.");

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
        include: {
            LoanFormData: true,
            LoanApprovedData: true,
            LoanEmiDetails: true,
        }
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    if (!loanApplication.creditApproved) {
        return res.respond(400, "Loan is not approved yet.");
    }

    const template = await prisma.agreementTemplate.findFirst({
        where: {
            id: templateId,
            isDeleted: false,
        }
    });
    if (!template) {
        return res.respond(404, "Agreement Template not found.");
    }

    const templatePath = path.join(
        __dirname,
        "../../..",
        template.path
    );
    console.log(templatePath)
    if (!fs.existsSync(templatePath)) {
        return res.respond(500, "Agreement template file missing on server.");
    }

    const htmlTemplate = fs.readFileSync(templatePath, "utf8");

    const businessContext = await buildAgreementContext(loanApplication);

    const resolvedValues = resolveContext(
        template.contextSchema,
        businessContext
    );

    const missing = Object.entries(resolvedValues)
        .filter(([_, value]) => value === "" || value === null || value === undefined)
        .map(([key]) => key);

    if (missing.length) {
        return res.respond(
            400,
            `Agreement generation failed. Missing: ${missing.join(", ")}`
        );
    }

    const finalHtml = injectTemplate(htmlTemplate, resolvedValues);

    const base64Pdf = await htmlToBase64Pdf(finalHtml);

    const inviteesPayload = [{
        name: resolvedValues.CUSTOMER_NAME,
        email: loanApplication.LoanFormData?.formJsonData.basicDetails.email,
        phone: resolvedValues.CUSTOMER_MOBILE
    }]

    const requestData = await createEsignRequest(resolvedValues.CUSTOMER_NAME, base64Pdf, inviteesPayload, loanApplication.id)

    await prisma.loanEsignDocuments.create({
        data: {
            applicationId: loanApplication.id,
            documentId: requestData.data.data.data.documentId,
            signUrlLink: requestData.data.data.data.invitees[0].signUrl,
            status: "PENDING",
        },
    });

    res.respond(200, "E-Sign Request Send Successfully!", requestData);
});

// ##########----------Leegality Webhook Handler----------##########
const leegalityWebhookHandler = asyncHandler(async (req, res) => {
    if (req.headers["x-api-key"] !== "epcmaawh") {
        return res.respond(401, "Unauthorized webhook");
    }
    const body = req.body;
    const timestamps = formatDateForFile()
    saveJsonResponse("leegality", timestamps, body)
    if (!body) {
        return res.respond(400, "Invalid webhook payload");
    }

    if (body.webhookType !== "Success" || body.documentStatus !== "Completed") {
        return res.respond(200, "Ignored");
    }

    let docDetails;
    let attempts = 0;

    while (attempts < 5) {
        docDetails = await fetchDocumentDetails(body.documentId);

        const payload = docDetails?.data?.data?.data;

        if (docDetails.success && payload?.file) {
            break;
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (!docDetails?.success) {
        console.warn("Signed document not ready yet:", body.documentId);
        return res.respond(200, "Webhook received, document pending");
    }

    const payload = docDetails?.data?.data?.data;

    if (!payload?.file) {
        console.warn("Signed document not ready yet:", body.documentId);
        return res.respond(200, "Webhook received, document pending");
    }

    const timestamp = formatDateForFile();
    const pdfPath = saveBase64Pdf(
        payload.file,
        "loan",
        "leegality",
        `signed_file_${body.documentId}_${timestamp}`
    );

    await prisma.loanEsignDocuments.update({
        where: { documentId: payload.documentId },
        data: {
            status: payload.status,
            signedFile: pdfPath,
        },
    });

    return res.respond(200, "Success");
});

module.exports = {
    sendEsignDocumentToCustomer,
    leegalityWebhookHandler
}