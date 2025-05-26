const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const xlsx = require("xlsx");

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

  const existingUser = await prisma.customUser.findFirst({
    where: {
      id: userId
    },
  });

  if (!existingUser) {
    return res.status(400).json({
      error: "User not found!",
    });
  }

  let createdByUserId = userId;
  let createdByType;

  if (existingUser.userType === "EMPLOYER") {
    createdByType = "EMPLOYER";
  } else if (existingUser.userType === "EMPLOYERSUBADMIN") {
    createdByType = "EMPLOYERSUBADMIN";

    const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
      where: { userId },
    });

    if (!employerSubAdmin) {
      return res.respond(404, "Employer Sub Admin not found!");
    }

    createdByUserId = employerSubAdmin.id;
  } else {
    return res.respond(403, "Unauthorized user type for payroll creation.");
  }

  const employee = await prisma.employee.findFirst({
    where: { customEmployeeId: customEmployeeId },
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
      createdByUserId,
      createdByType,
      employeeId: employee.id,
      customEmployeeId,
      income,
      date,
    },
  });

  res.respond(201, "Payroll created successfully!", createPayroll);
});

// ##########----------Bulk Upload Employee Current Payroll----------##########
const bulkUploadEmployeeCurrentPayroll = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { customEmployeeId } = req.body;

  if (!req.file || !req.file.path) {
    return res.respond(400, "Please upload an Excel file.");
  }

  if (!customEmployeeId) {
    return res.respond(400, "customEmployeeId is required.");
  }

  const existingUser = await prisma.customUser.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    return res.respond(404, "User not found!");
  }

  let createdByUserId = userId;
  let createdByType;

  if (existingUser.userType === "EMPLOYER") {
    createdByType = "EMPLOYER";
  } else if (existingUser.userType === "EMPLOYERSUBADMIN") {
    createdByType = "EMPLOYER_SUB_ADMIN";

    const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
      where: { userId },
    });

    if (!employerSubAdmin) {
      return res.respond(404, "Employer Sub Admin not found!");
    }

    createdByUserId = employerSubAdmin.id;
  } else {
    return res.respond(403, "Unauthorized user type for payroll creation.");
  }

  const employee = await prisma.employee.findFirst({
    where: { customEmployeeId: customEmployeeId },
  });

  if (!employee) {
    return res.respond(404, "Employee not found!");
  }

  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  let successCount = 0;
  const errorRows = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const { income, date } = row;

    try {
      if (!income || !date) {
        throw new Error("Missing income or date.");
      }

      const payrollExists = await prisma.employeeCurrentPayroll.findFirst({
        where: {
          employeeId: employee.id,
          date: new Date(date),
        },
      });

      if (payrollExists) {
        throw new Error("Payroll already exists for this date.");
      }

      await prisma.employeeCurrentPayroll.create({
        data: {
          createdByUserId,
          createdByType,
          employeeId: employee.id,
          customEmployeeId,
          income: new Prisma.Decimal(income),
          date: new Date(date),
        },
      });

      successCount++;
    } catch (err) {
      errorRows.push({
        row: i + 2,
        error: err.message,
        data: row,
      });
    }
  }

  res.respond(201, "Bulk payroll upload completed.", {
    successCount,
    failedCount: errorRows.length,
    errors: errorRows,
  });
});

// ##########----------Get Current Payroll----------##########
const getCurrentPayrolls = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { search = "", page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const existingUser = await prisma.customUser.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    return res.respond(404, "User not found!");
  }

  let employerId;

  if (existingUser.userType === "EMPLOYER") {
    const employer = await prisma.employer.findFirst({
      where: { userId },
    });

    if (!employer) {
      return res.respond(404, "Employer not found!");
    }

    employerId = employer.id;

  } else if (existingUser.userType === "EMPLOYERSUBADMIN") {
    const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
      where: { userId },
      include: {
        employer: true,
      },
    });

    if (!employerSubAdmin || !employerSubAdmin.employer) {
      return res.respond(404, "Employer Sub Admin or employer not found!");
    }

    employerId = employerSubAdmin.employer.id;

  } else {
    return res.respond(403, "Unauthorized user type for fetching payroll.");
  }

  const searchFilter = {
    OR: [
      { employeeName: { contains: search, mode: "insensitive" } },
      { mobile: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ],
  };

  const total = await prisma.employee.count({
    where: {
      employerId,
      ...(search ? searchFilter : {}),
    },
  });

  const payrolls = await prisma.employee.findMany({
    where: {
      employerId,
      ...(search ? searchFilter : {}),
    },
    skip,
    take: parseInt(limit),
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      employeeId: true,
      customEmployeeId: true,
      employeeName: true,
      mobile: true,
      email: true,
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

  res.respond(200, "Payroll records fetched successfully.", {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    data: payrolls,
  });
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

  const existingUser = await prisma.customUser.findUnique({ where: { id: userId } });
  if (!existingUser) {
    return res.respond(404, "User not found!");
  }

  let createdByUserId = userId;
  let createdByType;

  if (existingUser.userType === "EMPLOYER") {
    createdByType = "EMPLOYER";
  } else if (existingUser.userType === "EMPLOYERSUBADMIN") {
    createdByType = "EMPLOYERSUBADMIN";

    const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
      where: { userId },
    });

    if (!employerSubAdmin) {
      return res.respond(404, "Employer Sub Admin not found!");
    }

    createdByUserId = employerSubAdmin.id;
  } else {
    return res.respond(403, "Unauthorized user type for payroll creation.");
  }

  const employee = await prisma.employee.findFirst({
    where: { customEmployeeId: customEmployeeId },
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
      createdByUserId,
      createdByType,
      employeeId: employee.id,
      customEmployeeId,
      attendance,
      income: 5000,
      date,
    },
  });

  res.respond(201, "Payroll created successfully!", createPayroll);
});

// ##########----------Bulk Upload Employee Base Payroll----------##########
const bulkUploadEmployeeBasePayroll = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { customEmployeeId } = req.body;

  if (!req.file || !req.file.path) {
    return res.respond(400, "Please upload an Excel file.");
  }

  if (!customEmployeeId) {
    return res.respond(400, "customEmployeeId is required.");
  }

  const existingUser = await prisma.customUser.findUnique({ where: { id: userId } });
  if (!existingUser) {
    return res.respond(404, "User not found!");
  }

  let createdByUserId = userId;
  let createdByType;

  if (existingUser.userType === "EMPLOYER") {
    createdByType = "EMPLOYER";
  } else if (existingUser.userType === "EMPLOYERSUBADMIN") {
    createdByType = "EMPLOYERSUBADMIN";

    const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
      where: { userId },
    });

    if (!employerSubAdmin) {
      return res.respond(404, "Employer Sub Admin not found!");
    }

    createdByUserId = employerSubAdmin.id;
  } else {
    return res.respond(403, "Unauthorized user type for payroll creation.");
  }

  const employee = await prisma.employee.findFirst({
    where: { customEmployeeId: customEmployeeId },
  });

  if (!employee) {
    return res.respond(404, "Employee not found!");
  }

  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  let successCount = 0;
  let errorRows = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const { attendance, date } = row;

    try {
      if (
        attendance === undefined ||
        attendance === null ||
        attendance === "" ||
        !date
      ) {
        throw new Error("Missing attendance or date.");
      }

      const existingPayroll = await prisma.employeeBasePayroll.findFirst({
        where: {
          employeeId: employee.id,
          date: new Date(date),
        },
      });

      if (existingPayroll) {
        throw new Error("Payroll already exists for this date.");
      }

      await prisma.employeeBasePayroll.create({
        data: {
          createdByUserId,
          createdByType,
          employeeId: employee.id,
          customEmployeeId,
          attendance,
          income: 5000,
          date: new Date(date),
        },
      });

      successCount++;
    } catch (err) {
      errorRows.push({
        row: i + 2,
        error: err.message,
        data: row,
      });
    }
  }

  res.respond(201, "Bulk base payroll upload completed.", {
    successCount,
    failedCount: errorRows.length,
    errors: errorRows,
  });
});

// ##########----------Get Base Payroll----------##########
const getBasePayrolls = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { search = "", page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const existingUser = await prisma.customUser.findUnique({ where: { id: userId } });
  if (!existingUser) {
    return res.respond(404, "User not found!");
  }

  let employerId;

  if (existingUser.userType === "EMPLOYER") {
    const employer = await prisma.employer.findFirst({
      where: { userId },
    });

    if (!employer) {
      return res.respond(404, "Employer not found!");
    }

    employerId = employer.id;
  } else if (existingUser.userType === "EMPLOYERSUBADMIN") {
    const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
      where: { userId },
      include: {
        employer: true,
      },
    });

    if (!employerSubAdmin || !employerSubAdmin.employer) {
      return res.respond(404, "Employer Sub Admin or employer not found!");
    }

    employerId = employerSubAdmin.employer.id;
  } else {
    return res.respond(403, "Unauthorized user type for fetching payroll.");
  }

  const searchFilter = {
    OR: [
      { employeeName: { contains: search, mode: "insensitive" } },
      { mobile: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ],
  };

  const total = await prisma.employee.count({
    where: {
      employerId,
      ...(search ? searchFilter : {}),
    },
  });

  const payrolls = await prisma.employee.findMany({
    where: {
      employerId,
      ...(search ? searchFilter : {}),
    },
    skip,
    take: parseInt(limit),
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      employeeId: true,
      customEmployeeId: true,
      employeeName: true,
      mobile: true,
      email: true,
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

  const existingUser = await prisma.customUser.findUnique({ where: { id: userId } });
  if (!existingUser) {
    return res.respond(404, "User not found!");
  }

  let createdByUserId = userId;
  let createdByType;

  if (existingUser.userType === "EMPLOYER") {
    createdByType = "EMPLOYER";
  } else if (existingUser.userType === "EMPLOYERSUBADMIN") {
    createdByType = "EMPLOYERSUBADMIN";

    const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
      where: { userId },
    });

    if (!employerSubAdmin) {
      return res.respond(404, "Employer Sub Admin not found!");
    }

    createdByUserId = employerSubAdmin.id;
  } else {
    return res.respond(403, "Unauthorized user type for payroll creation.");
  }

  const employee = await prisma.employee.findFirst({
    where: { customEmployeeId: customEmployeeId },
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
      createdByUserId,
      createdByType,
      employeeId: employee.id,
      customEmployeeId,
      income,
      startDate,
      endDate,
    },
  });

  res.respond(201, "Payroll created successfully!", createPayroll);
});

// ##########----------Bulk Upload Employee Historical Payroll----------##########
const bulkUploadEmployeeHistoricalPayroll = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { customEmployeeId } = req.body;

  if (!req.file || !req.file.path) {
    return res.respond(400, "Please upload an Excel file.");
  }

  if (!customEmployeeId) {
    return res.respond(400, "customEmployeeId is required.");
  }

  const existingUser = await prisma.customUser.findUnique({ where: { id: userId } });
  if (!existingUser) {
    return res.respond(404, "User not found!");
  }

  let createdByUserId = userId;
  let createdByType;

  if (existingUser.userType === "EMPLOYER") {
    createdByType = "EMPLOYER";
  } else if (existingUser.userType === "EMPLOYERSUBADMIN") {
    createdByType = "EMPLOYERSUBADMIN";

    const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
      where: { userId },
    });

    if (!employerSubAdmin) {
      return res.respond(404, "Employer Sub Admin not found!");
    }

    createdByUserId = employerSubAdmin.id;
  } else {
    return res.respond(403, "Unauthorized user type for payroll creation.");
  }

  const employee = await prisma.employee.findFirst({
    where: { customEmployeeId: customEmployeeId },
  });

  if (!employee) {
    return res.respond(404, "Employee not found!");
  }

  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  let successCount = 0;
  let errorRows = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const { startDate, endDate, income } = row;

    try {
      if (!startDate || !endDate || !income) {
        throw new Error("Missing startDate, endDate or income.");
      }

      const existingPayroll = await prisma.employeeHistoricalPayroll.findFirst({
        where: {
          employeeId: employee.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      });

      if (existingPayroll) {
        throw new Error("Payroll already exists for this date range.");
      }

      await prisma.employeeHistoricalPayroll.create({
        data: {
          createdByUserId,
          createdByType,
          employeeId: employee.id,
          customEmployeeId,
          income: Number(income),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      });

      successCount++;
    } catch (err) {
      errorRows.push({
        row: i + 2,
        error: err.message,
        data: row,
      });
    }
  }

  res.respond(201, "Bulk historical payroll upload completed.", {
    successCount,
    failedCount: errorRows.length,
    errors: errorRows,
  });
});

// ##########----------Get Base Payroll----------##########
const getHistoricalPayrolls = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { search = "", page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const existingUser = await prisma.customUser.findUnique({ where: { id: userId } });
  if (!existingUser) {
    return res.respond(404, "User not found!");
  }

  let employerId;

  if (existingUser.userType === "EMPLOYER") {
    const employer = await prisma.employer.findFirst({
      where: { userId },
    });

    if (!employer) {
      return res.respond(404, "Employer not found!");
    }

    employerId = employer.id;
  } else if (existingUser.userType === "EMPLOYERSUBADMIN") {
    const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
      where: { userId },
      include: {
        employer: true,
      },
    });

    if (!employerSubAdmin || !employerSubAdmin.employer) {
      return res.respond(404, "Employer Sub Admin or employer not found!");
    }

    employerId = employerSubAdmin.employer.id;
  } else {
    return res.respond(403, "Unauthorized user type for fetching payroll.");
  }

  const searchFilter = {
    OR: [
      { employeeName: { contains: search, mode: "insensitive" } },
      { mobile: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ],
  };

  const total = await prisma.employee.count({
    where: {
      employerId,
      ...(search ? searchFilter : {}),
    },
  });

  const payrolls = await prisma.employee.findMany({
    where: {
      employerId,
      ...(search ? searchFilter : {}),
    },
    skip,
    take: parseInt(limit),
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      employeeId: true,
      customEmployeeId: true,
      employeeName: true,
      mobile: true,
      email: true,
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

  res.respond(200, "Payroll records fetched successfully.", {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    data: payrolls,
  });
});

module.exports = {
  createEmployeeCurrentPayroll,
  bulkUploadEmployeeCurrentPayroll,
  getCurrentPayrolls,
  createEmployeeBasePayroll,
  bulkUploadEmployeeBasePayroll,
  getBasePayrolls,
  createEmployeeHistoricalPayroll,
  bulkUploadEmployeeHistoricalPayroll,
  getHistoricalPayrolls,
};
