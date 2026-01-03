const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { crifReport } = require("../../../utils/proxyUtils");
const { formatDateTime, formatDateForFile } = require("../../../utils/dateFormatter");
const { saveBase64Html } = require("../../../utils/saveBase64Html");

const prisma = new PrismaClient();

// ##########----------Fetch Credit Report Of Customer----------##########
const fetchCreditReportCustomer = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { firstName, middleName = "", lastName, dob, pan_number, address, city, state, pincode, mobile } = req.body;

    if (!loanApplicationId) return res.respond(400, "Loan Application Id is required.");
    if (!firstName || !lastName || !dob || !pan_number || !address || !city || !state || !pincode || !mobile) return res.respond(400, "required fields missing.");

    const user = await prisma.customUser.findFirst({
        where: { id: userId },
    });
    if (!user) return res.respond(404, "User not found.");

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    const applicantData = {
        inquiryDateTime: formatDateTime(),
        applicantId: loanApplication.customerId,
        firstName: firstName,
        middleName: middleName,
        lastName: lastName,
        dob: dob,
        pan_number: pan_number,
        address: address,
        city: city,
        state: state,
        pincode: pincode,
        mobile: mobile,
        inquiryId: loanApplication.id,
        applicationId: loanApplication.id,
        loanAmount: "",
        ltv: "",
        term: "",
    }

    const crifResponse = await crifReport(applicantData)

    if (!crifResponse.success) {
        return res.respond(crifResponse.statusCode || 500, "Failed to fetch CRIF report", crifResponse.data);
    }

    const reportFile = crifResponse?.data?.data?.["CIR-REPORT-FILE"];
    if (!reportFile) {
        return res.respond(500, "Invalid CRIF response structure");
    }

    const scoreArray =
        reportFile?.["REPORT-DATA"]?.["STANDARD-DATA"]?.["SCORE"] || [];

    const crifScore =
        scoreArray.length > 0 && scoreArray[0].VALUE
            ? Number(scoreArray[0].VALUE)
            : null;

    const accountSummary =
        reportFile?.["REPORT-DATA"]?.["ACCOUNTS-SUMMARY"] || null;

    const printableBase64 = reportFile?.["PRINTABLE-REPORT"]?.["CONTENT"];

    const timestamp = formatDateForFile();

    const crifPdfPath = saveBase64Html(
        printableBase64,
        `crif_${loanApplication.id}_${timestamp}`
    );

    await prisma.loanApplication.update({
        where: { id: loanApplication.id },
        data: {
            crifScore: crifScore,
        },
    });

    await prisma.loanCreditData.upsert({
        where: { applicationId: loanApplication.id },
        update: {
            crifPdf: crifPdfPath,
            crifAccountSummery: accountSummary,
        },
        create: {
            applicationId: loanApplication.id,
            crifPdf: crifPdfPath,
            crifAccountSummery: accountSummary,
        },
    });

    res.respond(200, "Credit Report Fetched Successfully!");
});

module.exports = {
    fetchCreditReportCustomer,
};