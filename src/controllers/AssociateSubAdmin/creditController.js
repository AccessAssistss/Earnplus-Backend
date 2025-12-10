const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const { crifReport } = require("../../../utils/proxyUtils");

const prisma = new PrismaClient();

// ##########----------Fetch Credit Report Of Customer----------##########
const fetchCreditReportCustomer = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { loanApplicationId } = req.params;
    const { firstName, middleName = "", lastName, dob, pan_number, address, city, state, pincode, loanAmount, ltv, term, mobile } = req.body;

    if (!loanApplicationId) return res.respond(400, "Loan Application Id is required.");
    if (!firstName || !lastName || !dob || !pan_number || !address || !city || !state || !pincode || !loanAmount || !ltv || !term || !mobile) return res.respond(400, "required fields missing.");

    const user = await prisma.customUser.findFirst({
        where: { id: userId, isDeleted: false },
    });
    if (!user) return res.respond(404, "User not found.");

    const loanApplication = await prisma.loanApplication.findUnique({
        where: { id: loanApplicationId },
    });
    if (!loanApplication) return res.respond(404, "Loan Application not found.");

    const applicantData = {
        inquiryDateTime: new Date.now(),
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
        loanAmount: loanAmount,
        ltv: ltv,
        term: term,
    }

    const crifResponse = await crifReport(applicantData)
    if (!crifResponse.success) {
        return res.respond(crifResponse.statusCode || 500, "Failed to fetch CRIF report", crifResponse.data);
    }

    await prisma.loanCrifReport.upsert({
        where: { loanApplicationId: loanApplication.id },
        update: {
            responseBody: crifResponse.data,
            updatedAt: new Date(),
        },
        create: {
            loanId: loanApplication.id,
            responseBody: crifResponse.data,
        },
    });

    res.respond(200, "Credit Report Fetched Successfully!");
});

module.exports = {
    fetchCreditReportCustomer,
};