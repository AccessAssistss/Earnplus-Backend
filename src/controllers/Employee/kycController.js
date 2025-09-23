const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

const createKYCRequest = asyncHandler(async (req, res) => {
    const userId = req.user;

    const employee = await prisma.employee.findFirst({
        where: { userId },
    });
    if (!employee) {
        return res.respond(404, "Employee not found");
    }

    const existingRequest = await prisma.kYCRequest.findUnique({
        where: {
            employeeId: employee.id,
        },
    });
    if (existingRequest) {
        return res.respond(409, "KYC request already exists");
    }

    const subAdmins = await prisma.associateSubAdmin.findMany();
    if (subAdmins.length === 0) {
        return res.respond(404, "No Associate Sub-Admins found to assign KYC request");
    }

    const randomSubAdmin =
        subAdmins[Math.floor(Math.random() * subAdmins.length)];

    const newRequest = await prisma.kYCRequest.create({
        data: {
            employeeId: employee.id,
            associateSubAdminId: randomSubAdmin.id,
            kycStatus: "PENDING",
        },
    });

    return res.respond(201, "KYC request created successfully", newRequest);
});

const getKYCRequest = asyncHandler(async (req, res) => {
    const userId = req.user;

    const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
        where: { userId },
    });
    if (!associateSubAdmin) {
        return res.respond(404, "Associate SubAdmin not found");
    }

    const kycRequests = await prisma.kYCRequest.findMany({
        include: {
            employee: {
                select: {
                    id: true,
                    employeeName: true,
                    customEmployeeId: true,
                    mobile: true,
                    employer: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            }
        }
    });
    if (!kycRequests) {
        return res.respond(404, "KYC request not found");
    }

    return res.respond(200, "KYC request fetched successfully", kycRequests);
});

const getKYCDetails = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { kycId } = req.params

    const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
        where: { userId },
    });
    if (!associateSubAdmin) {
        return res.respond(404, "Associate SubAdmin not found");
    }

    const kycRequest = await prisma.kYCRequest.findFirst({
        where: { id: kycId },
        include: {
            employee: {
                select: {
                    id: true,
                    employeeName: true,
                    customEmployeeId: true,
                    mobile: true,
                    employer: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            }
        }
    });
    if (!kycRequest || !kycRequest.employee) {
        return res.respond(404, "KYC request or employee not found");
    }

    return res.respond(200, "KYC details fetched successfully", kycRequest);
});

const updateKYCStatus = asyncHandler(async (req, res) => {
    const userId = req.user;
    const { status } = req.body;

    if (!["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED"].includes(status)) {
        return res.respond(400, "Invalid KYC status!");
    }

    const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
        where: { userId },
    });
    if (!associateSubAdmin) {
        return res.respond(404, "Associate SubAdmin not found!");
    }

    const existingRequest = await prisma.kYCRequest.findUnique({
        where: { associateSubAdminId: associateSubAdmin.id },
    });
    if (!existingRequest) {
        return res.respond(404, "KYC request not found!");
    }

    const updatedRequest = await prisma.kYCRequest.update({
        where: { associateSubAdminId: associateSubAdmin.id },
        data: {
            kycStatus: status,
        },
    });

    return res.respond(200, "KYC status updated successfully!", updatedRequest);
});

module.exports = {
    createKYCRequest,
    getKYCRequest,
    getKYCDetails,
    updateKYCStatus
};