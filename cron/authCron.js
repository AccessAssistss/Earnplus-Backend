const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const autoDeactivateAccounts = async () => {
  const requests =
    await prisma.employeeAccountStatusRequest.findMany({
      where: {
        requestType: "INACTIVATE",
        status: "PENDING",
        cancelledAt: null,
        scheduledAt: { lte: new Date() },
      },
      include: { employee: true },
    });

  for (const req of requests) {
    await prisma.employee.update({
      where: { id: req.employeeId },
      data: { accountStatus: "INACTIVE" },
    });

    await prisma.employeeAccountStatusRequest.update({
      where: { id: req.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewRemark: "Auto-deactivated after 7-day grace period",
      },
    });
  }
};


module.exports = {
    autoDeactivateAccounts
}