const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { createVKYCLink, GetVKYCStatusByUniqueId, GetVKYCDetailsBySessionId } = require("../../../utils/proxyUtils");
const { saveJsonResponse } = require("../../../utils/jsonResopnseSaver");
const { formatDateForFile } = require("../../../utils/dateFormatter");

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

    const vkycResponse = await createVKYCLink(firstName, lastName, loanId = loanApplication.id, mobile, email, preferredAgentEmailId = associateSubAdmin.email)

    if (!vkycResponse.success) {
        return res.respond(500, "Failed to generate VKYC link", vkycResponse);
    }

    await prisma.loanApplication.update({
        where: { id: loanApplicationId },
        data: {
            vkycStatus: "LINK_GENERATED"
        }
    });


    await prisma.loanVkycData.upsert({
        where: {
            applicationId: loanApplicationId,
        },
        update: {
            vkycLink: vkycResponse.data?.data?.url || "Generated",
            vkycLinkCreatedAt: new Date(),
        },
        create: {
            applicationId: loanApplicationId,
            vkycLink: vkycResponse.data?.data?.url || "Generated",
            vkycLinkCreatedAt: new Date(),
        },
    });

    await prisma.loanApplicationLogs.create({
        data: {
            loanApplicationId,
            performedById: associateSubAdmin.id,
            action: "VKYC_LINK_GENERATED",
            remarks: "VKYC link generated and sent to customer"
        }
    });

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

    const vkycStatus = await GetVKYCStatusByUniqueId([loanApplication.id]);
    if (!vkycStatus.success || !vkycStatus.data.data) {
        return res.respond(400, "Unable to fetch VKYC Status");
    }

    const sessionId = Object.keys(vkycStatus.data.data)[0];
    if (!sessionId) {
        return res.respond(404, "Session ID not found in VKYC status response.");
    }

    const vkycDetails = await GetVKYCDetailsBySessionId([sessionId]);
    if (!vkycDetails.success) {
        return res.respond(400, "Unable to fetch VKYC Details");
    }

    await prisma.loanVkycData.upsert({
        where: { applicationId: loanApplicationId },
        update: {
            vkycJson: vkycDetails.data.data,
        },
        create: {
            applicationId: loanApplicationId,
            vkycJson: vkycDetails.data.data,
        },
    });

    res.respond(200, "VKYC Details fetched Successfully!", vkycDetails.data.data);
});

// ##########----------Update VKYC Status----------##########
const updateVKYCStatus = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { vkycStatus } = req.body;

    const validStatuses = ["IN_PROGRESS", "COMPLETED", "FAILED"];
    if (!validStatuses.includes(vkycStatus)) {
        return res.respond(400, "Invalid VKYC status!");
    }

    const opsManager = await prisma.associateSubAdmin.findFirst({
        where: { userId, isDeleted: false }
    });

    if (!opsManager) {
        return res.respond(404, "Operations Manager not found!");
    }

    const updatedLoan = await prisma.loanApplication.update({
        where: { id: loanApplicationId },
        data: { vkycStatus }
    });

    await prisma.loanApplicationLogs.create({
        data: {
            loanApplicationId,
            performedById: opsManager.id,
            action: `VKYC_STATUS_UPDATED_TO_${vkycStatus}`,
            remarks: `VKYC status updated to ${vkycStatus}`
        }
    });

    res.respond(200, "VKYC status updated successfully!", updatedLoan);
});

const fetchAndStoreVKYCDetails = async (loanApplicationId) => {
    const vkycStatus = await GetVKYCStatusByUniqueId([loanApplicationId]);
    if (!vkycStatus.success || !vkycStatus.data?.data) return;

    const sessionId = Object.keys(vkycStatus.data.data)[0];
    if (!sessionId) return;

    const vkycDetails = await GetVKYCDetailsBySessionId([sessionId]);
    if (!vkycDetails.success) return;

    await prisma.loanVkycData.upsert({
        where: { applicationId: loanApplicationId },
        update: {
            vkycJson: vkycDetails.data.data,
        },
        create: {
            applicationId: loanApplicationId,
            vkycJson: vkycDetails.data.data,
        },
    });
};

// ##########----------Digitap Webhook Handler----------##########
const digitapWebhookHandler = asyncHandler(async (req, res) => {
    if (req.headers["x-api-key"] !== "epcmaawh") {
        console.warn("Invalid webhook key");
    }
    console.log("Digitap Webhook Running")

    const timestamp = formatDateForFile()

    saveJsonResponse("VKYC", timestamp, req.body)

    const { state, status, uniqueId } = req.body;

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: uniqueId },
    });
    if (!loanApplication) {
        console.log("Loan application not found");
    }

    if (state === "VKYC") {
        let vkycStatus = null;

        if (status === "APPROVED") vkycStatus = "COMPLETED";
        if (status === "REJECTED") vkycStatus = "REJECTED";
        if (status === "DROPPED") vkycStatus = "DROPPED";

        if (!loanApplication) {
            console.warn("VKYC webhook before loan creation", uniqueId);
        }

        if (vkycStatus) {
            await prisma.loanApplication.update({
                where: { id: uniqueId },
                data: { vkycStatus },
            });
        }
    }

    if (["APPROVED", "REJECTED", "DROPPED"].includes(status)) {
        await fetchAndStoreVKYCDetails(uniqueId);
    }

    return res.respond(200, "Success");
});

module.exports = {
    createVKYCLinkForCustomer,
    getVKYCDataPointDetails,
    updateVKYCStatus,
    digitapWebhookHandler
};