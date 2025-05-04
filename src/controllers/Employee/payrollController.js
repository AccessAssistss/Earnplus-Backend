const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ####################--------------------Current Payroll--------------------####################
// ##########----------Create Employee Current Payroll----------##########
const createEmployeeCurrentPayroll = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { customEmployeeId, income, date } = req.body;

  if (!customEmployeeId || !income || !date) {
    return res.respond(
      400,
      "All fields are required: customEmployeeId, income, date."
    );
  }

  const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
    where: { userId },
  });

  if (!employerSubAdmin) {
    return res.respond(404, "Employer Sub Admin not found!");
  }

  const employee = await prisma.employee.findFirst({
    where: { employeeId: customEmployeeId },
  });

  if (!employee) {
    return res.respond(404, "Employee not found!");
  }

  const existingPayroll = await prisma.employeeCurrentPayroll.findFirst({
    where: {
      employeeId: employee.id,
      date,
    },
  });

  if (existingPayroll) {
    return res.respond(409, "Payroll already exists for this date.");
  }

  const createPayroll = await prisma.employeeCurrentPayroll.create({
    data: {
      createdBy: employerSubAdmin.id,
      employeeId: employee.id,
      customEmployeeId,
      income,
      date,
    },
  });

  res.respond(201, "Payroll created successfully!", createPayroll);
});

// ##########----------Get Current Payroll----------##########
const getCurrentPayrolls = asyncHandler(async (req, res) => {
  const userId = req.user;

  const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
    where: { userId },
    include: {
      employer: true,
    },
  });

  if (!employerSubAdmin) {
    return res.respond(404, "Employer Sub Admin not found!");
  }

  const payrolls = await prisma.employee.findMany({
    where: {
      employerId: employerSubAdmin.employer.id,
    },
    select: {
      id: true,
      employeeId: true,
      employeeName: true,
      mobile: true,
      email: true,
      department: true,
      designation: true,
      EmployeeCurrentPayroll: {
        orderBy: {
          date: "desc",
        },
        select: {
          id: true,
          income: true,
          date: true,
          createdAt: true,
        },
      },
    },
  });

  res.respond(200, "Payroll records fetched successfully.", payrolls);
});

// ####################--------------------Base Payroll--------------------####################
// ##########----------Create Employee Base Payroll----------##########
const createEmployeeBasePayroll = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { customEmployeeId, attendance, date } = req.body;

  if (
    !customEmployeeId ||
    !date ||
    attendance === undefined ||
    attendance === null ||
    attendance === ""
  ) {
    return res.respond(
      400,
      "All fields are required: customEmployeeId and attendance."
    );
  }

  const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
    where: { userId },
  });

  if (!employerSubAdmin) {
    return res.respond(404, "Employer Sub Admin not found!");
  }

  const employee = await prisma.employee.findFirst({
    where: { employeeId: customEmployeeId },
  });

  if (!employee) {
    return res.respond(404, "Employee not found!");
  }

  const existingPayroll = await prisma.employeeBasePayroll.findFirst({
    where: {
      employeeId: employee.id,
      date,
    },
  });

  if (existingPayroll) {
    return res.respond(409, "Payroll already exists for this date.");
  }

  const createPayroll = await prisma.employeeBasePayroll.create({
    data: {
      createdBy: employerSubAdmin.id,
      employeeId: employee.id,
      customEmployeeId,
      attendance,
      income: 5000,
      date,
    },
  });

  res.respond(201, "Payroll created successfully!", createPayroll);
});

// ##########----------Get Base Payroll----------##########
const getBasePayrolls = asyncHandler(async (req, res) => {
  const userId = req.user;

  const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
    where: { userId },
    include: {
      employer: true,
    },
  });

  if (!employerSubAdmin) {
    return res.respond(404, "Employer Sub Admin not found!");
  }

  const payrolls = await prisma.employee.findMany({
    where: {
      employerId: employerSubAdmin.employer.id,
    },
    select: {
      id: true,
      employeeId: true,
      employeeName: true,
      mobile: true,
      email: true,
      department: true,
      designation: true,
      EmployeeBasePayroll: {
        orderBy: {
          date: "desc",
        },
        select: {
          id: true,
          income: true,
          attendance: true,
          date: true,
          createdAt: true,
        },
      },
    },
  });

  res.respond(200, "Payroll records fetched successfully.", payrolls);
});

// ####################--------------------Historical Payroll--------------------####################
// ##########----------Create Employee Historical Payroll----------##########
const createEmployeeHistoricalPayroll = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { customEmployeeId, startDate, endDate, income } = req.body;

  if (!customEmployeeId || !startDate || !endDate || !income) {
    return res.respond(
      400,
      "All fields are required: customEmployeeId, start date, end date and income."
    );
  }

  const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
    where: { userId },
  });

  if (!employerSubAdmin) {
    return res.respond(404, "Employer Sub Admin not found!");
  }

  const employee = await prisma.employee.findFirst({
    where: { employeeId: customEmployeeId },
  });

  if (!employee) {
    return res.respond(404, "Employee not found!");
  }

  const existingPayroll = await prisma.employeeHistoricalPayroll.findFirst({
    where: {
      employeeId: employee.id,
      startDate,
      endDate,
    },
  });

  if (existingPayroll) {
    return res.respond(409, "Payroll already exists for this month.");
  }

  const createPayroll = await prisma.employeeHistoricalPayroll.create({
    data: {
      createdBy: employerSubAdmin.id,
      employeeId: employee.id,
      customEmployeeId,
      income,
      startDate,
      endDate,
    },
  });

  res.respond(201, "Payroll created successfully!", createPayroll);
});

// ##########----------Get Base Payroll----------##########
const getHistoricalPayrolls = asyncHandler(async (req, res) => {
  const userId = req.user;

  const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
    where: { userId },
    include: {
      employer: true,
    },
  });

  if (!employerSubAdmin) {
    return res.respond(404, "Employer Sub Admin not found!");
  }

  const payrolls = await prisma.employee.findMany({
    where: {
      employerId: employerSubAdmin.employer.id,
    },
    select: {
      id: true,
      employeeId: true,
      employeeName: true,
      mobile: true,
      email: true,
      department: true,
      designation: true,
      EmployeeHistoricalPayroll: {
        orderBy: {
          endDate: "desc",
        },
        select: {
          id: true,
          income: true,
          startDate: true,
          endDate: true,
          createdAt: true,
        },
      },
    },
  });

  res.respond(200, "Payroll records fetched successfully.", payrolls);
});

module.exports = {
  createEmployeeCurrentPayroll,
  getCurrentPayrolls,
  createEmployeeBasePayroll,
  getBasePayrolls,
  createEmployeeHistoricalPayroll,
  getHistoricalPayrolls,
};
