const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyPassword,
} = require("../../../utils/authUtils");
const xlsx = require("xlsx");
const { generateUniqueEmployeeId } = require("../../../utils/uniqueCodeGenerator");

const prisma = new PrismaClient();

// ###############---------------Generate Access And Refresh Token---------------###############
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await prisma.customUser.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await prisma.customUser.update({
      where: { id: userId },
      data: { refreshToken },
    });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new Error("Something went wrong while generating tokens");
  }
};

// ####################--------------------AUTH--------------------####################
// ##########----------Employer Registration----------##########
const registerEmployer = asyncHandler(async (req, res) => {
  const { userType = "EMPLOYER", email, mobile, password, name } = req.body;

  if (!email || !mobile || !password || !name) {
    return res.respond(400, "All fields required!");
  }

  if (!mobile.match(/^[6789]\d{9}$/)) {
    return res.respond(400, "Invalid mobile number!");
  }

  const existingUser = await prisma.customUser.findFirst({
    where: {
      OR: [{ email }, { mobile }],
    },
  });

  if (existingUser) {
    return res.respond(
      400,
      "User with this mobile number or Email already exists!"
    );
  }

  const hashed = await hashPassword(password);

  const createCustomUser = await prisma.customUser.create({
    data: {
      email,
      mobile,
      name,
      userType,
    },
  });

  let registeredEmployer = await prisma.employer.create({
    data: {
      user: {
        connect: { id: createCustomUser.id },
      },
      email,
      mobile,
      name,
      password: hashed,
    },
  });

  registeredEmployer = {
    id: registeredEmployer.id,
    name: registeredEmployer.name,
    email: registeredEmployer.email,
    mobile: registeredEmployer.mobile,
    createdAt: registeredEmployer.createdAt,
    updatedAt: registeredEmployer.updatedAt,
  };

  res.respond(201, "Employer registered successfully!", registeredEmployer);
});

// ##########----------Employer Login----------##########
const loginEmployer = asyncHandler(async (req, res) => {
  const { userType = "EMPLOYER", email, password } = req.body;

  if (!email || !password) {
    return res.respond(400, "All fields required!");
  }

  const existingUser = await prisma.customUser.findFirst({
    where: { email, userType },
  });

  if (!existingUser) {
    return res.respond(400, "User not found!");
  }

  const existingEmployer = await prisma.employer.findFirst({
    where: { email },
  });

  if (!existingEmployer) {
    return res.respond(400, "Employer not found!");
  }

  const isMatch = await verifyPassword(password, existingEmployer.password);

  if (isMatch) {
    return res.respond(400, "Invalid Credentials!");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    existingUser.id
  );

  const user = {
    id: existingEmployer.id,
    name: existingEmployer.name,
    email: existingEmployer.email,
    mobile: existingEmployer.mobile,
    gst: existingEmployer.gst,
    pan: existingEmployer.pan,
    step: existingEmployer.step,
    isPassGenerated: existingEmployer.isPassGenerated,
    userType: existingUser.userType,
  };

  res.respond(200, "Employer Logged In successfully!", {
    user,
    accessToken,
    refreshToken,
  });
});

// ##########----------Employer Profile Completion----------##########
const EmployerProfileCompletion = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    industryType,
    businessLocation,
    businessDescription,
    establishmentDate,
    country,
    state,
    district,
    pincode,
  } = req.body;

  if (
    !industryType ||
    !businessLocation ||
    !businessDescription ||
    !establishmentDate ||
    !country ||
    !state ||
    !district ||
    !pincode
  ) {
    return res.respond(
      400,
      "All profile fields are required to complete the profile!"
    );
  }

  const employer = await prisma.employer.findUnique({
    where: { userId },
  });

  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  const businessDetails = await prisma.employerBusinessDetails.create({
    data: {
      employerId: employer.id,
      industryTypeId: industryType,
      businessLocation,
      businessDescription,
      establishmentDate,
      countryId: country,
      stateId: state,
      districtId: district,
      pincode,
    },
  });

  await prisma.employer.update({
    where: { id: employer.id },
    data: {
      step: 2,
    },
  });

  res.respond(200, "Employer profile completed successfully!", businessDetails);
});

// ##########----------Add Employer Work Location----------##########
const addEmployerWorkLocation = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { workspaceName, noOfEmployees, address, country, state, district } =
    req.body;

  if (!workspaceName || !address || !country || !state || !district) {
    return res.respond(
      400,
      "All profile fields are required to add Work Location!"
    );
  }

  const employer = await prisma.employer.findUnique({
    where: { userId },
  });

  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  const workLocation = await prisma.employerLocationDetails.create({
    data: {
      employerId: employer.id,
      workspaceName,
      noOfEmployees,
      address,
      countryId: country,
      stateId: state,
      districtId: district,
    },
  });

  await prisma.employer.update({
    where: { id: employer.id },
    data: {
      step: 3,
    },
  });

  res.respond(200, "Work Location added successfully!", workLocation);
});

// ##########----------Add Employer Company Policy----------##########
const addEmployerCompanyPolicy = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    noticePeriod,
    probationPeriod,
    annualLeaves,
    sickLeaves,
    casualLeaves,
    maternityLeaves,
    overtimePolicy,
    registrationPolicy,
    remoteworkPolicy,
    otherPolicies,
  } = req.body;

  if (
    !noticePeriod ||
    !probationPeriod ||
    !annualLeaves ||
    !sickLeaves ||
    !casualLeaves ||
    !maternityLeaves ||
    !overtimePolicy ||
    !registrationPolicy ||
    !remoteworkPolicy ||
    !otherPolicies
  ) {
    return res.respond(
      400,
      "All profile fields are required to add Company Policy!"
    );
  }

  const employer = await prisma.employer.findUnique({
    where: { userId },
  });

  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  const companyPolicy = await prisma.employerCompanyPolicies.create({
    data: {
      employerId: employer.id,
      noticePeriod,
      probationPeriod,
      annualLeaves,
      sickLeaves,
      casualLeaves,
      maternityLeaves,
      overtimePolicy,
      registrationPolicy,
      remoteworkPolicy,
      otherPolicies,
    },
  });

  await prisma.employer.update({
    where: { id: employer.id },
    data: {
      step: 4,
    },
  });

  res.respond(200, "Company Policy added successfully!", companyPolicy);
});

// ##########----------Add Employer Contract Type----------##########
const addEmployerContractType = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { contractTypeId } = req.body;

  if (!Array.isArray(contractTypeId) || contractTypeId.length === 0) {
    return res.respond(400, "Contract Type IDs must be a non-empty array!");
  }

  const employer = await prisma.employer.findUnique({
    where: { userId },
  });

  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  const dataToInsert = contractTypeId.map((id) => ({
    employerId: employer.id,
    contractTypeId: id,
  }));

  await prisma.employerContractType.createMany({
    data: dataToInsert,
    skipDuplicates: true,
  });

  const insertedRecords = await prisma.employerContractType.findMany({
    where: {
      employerId: employer.id,
      contractTypeId: {
        in: contractTypeId,
      },
    },
    include: {
      contractType: true,
    },
  });

  await prisma.employer.update({
    where: { id: employer.id },
    data: {
      isPassGenerated: true,
    },
  });

  res.respond(200, "Contract Types added successfully!", insertedRecords);
});

// ##########----------Handle Employer Activation----------##########
const handleEmployerActivationStatus = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { employerId, isActive } = req.body;

  if (!employerId) {
    return res.respond(400, "employerId is required!");
  }

  if (isActive === undefined || isActive === null || isActive === "") {
    return res.respond(400, "isActive field is required!");
  }

  const associate = await prisma.associate.findUnique({
    where: { userId },
  });

  if (!associate) {
    return res.respond(404, "Associate not found!");
  }

  const employer = await prisma.employer.findUnique({
    where: { id: employerId },
  });

  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  await prisma.employer.update({
    where: { id: employerId },
    data: { isActive: isActive },
  });

  res.respond(
    200,
    "Employer Activation status changed successfully!",
    isActive
  );
});

// ##########----------Get All Employers----------##########
const getAllEmployers = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { search = "" } = req.query;

  const employee = await prisma.employee.findFirst({
    where: { userId },
  });

  if (!employee) {
    return res.respond(404, "Employee not found");
  }

  const employers = await prisma.employer.findMany({
    where: {
      isDeleted: false,
      OR: [
        { name: { contains: search, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      employerId: true,
      name: true,
      email: true,
      mobile: true,
      createdAt: true,
      updatedAt: true,
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  res.respond(200, "Employers fetched successfully!", employers);
});

// ##########----------Employer Profile----------##########
const getEmployerProfile = asyncHandler(async (req, res) => {
  const userId = req.user;

  const countrySelect = {
    select: {
      id: true,
      countryName: true,
    },
  };

  const stateSelect = {
    select: {
      id: true,
      stateName: true,
    },
  };

  const districtSelect = {
    select: {
      id: true,
      districtName: true,
    },
  };

  const employer = await prisma.employer.findUnique({
    where: {
      userId: userId,
    },
    select: {
      id: true,
      employerId: true,
      name: true,
      email: true,
      mobile: true,
      pan: true,
      gst: true,
      createdAt: true,
      updatedAt: true,
      employerBusinessDetails: {
        select: {
          id: true,
          businessLocation: true,
          businessDescription: true,
          establishmentDate: true,
          pincode: true,
          createdAt: true,
          updatedAt: true,
          country: countrySelect,
          state: stateSelect,
          district: districtSelect,
          industryType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      EmployerCompanyPolicies: {
        select: {
          id: true,
          noticePeriod: true,
          probationPeriod: true,
          annualLeaves: true,
          sickLeaves: true,
          casualLeaves: true,
          maternityLeaves: true,
          overtimePolicy: true,
          registrationPolicy: true,
          remoteworkPolicy: true,
          otherPolicies: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      EmployerLocationDetails: {
        select: {
          id: true,
          workspaceName: true,
          noOfEmployees: true,
          address: true,
          country: countrySelect,
          state: stateSelect,
          district: districtSelect,
          createdAt: true,
          updatedAt: true,
        },
      },
      EmployerContractType: {
        select: {
          id: true,
          contractType: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
  });

  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  res.respond(200, "Employer fetched successfully!", employer);
});

// ##########----------Get Employer Contract Types----------##########
const getEmployerContractTypes = asyncHandler(async (req, res) => {
  const { employerId } = req.query;

  const contractTypes = await prisma.employerContractType.findMany({
    where: {
      isDeleted: false,
      employerId,
    },
    orderBy: { createdAt: "desc" },
  });

  res.respond(
    200,
    "Employer Contract Types fetched successfully!",
    contractTypes
  );
});

// ##########----------Delete Employer----------##########
const deleteEmployer = asyncHandler(async (req, res) => {
  const userId = req.user;

  const employer = await prisma.employer.findFirst({
    where: { userId },
  });

  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  await prisma.employer.update({
    where: { id: employer.id },
    data: { isDeleted: true },
  });

  res.respond(200, "Employer deleted successfully!");
});

// ##########----------Add Employees By Employer----------##########
const addEmployeeByEmployer = asyncHandler(async (req, res) => {
  const userId = req.user;

  const {
    userType = "EMPLOYEE",
    employeeName,
    mobile,
    email,
    dob,
    maritalStatus,
    gender,
    nationality,
    country,
    panNo,
    aadharNo,
    address,
    city,
    state,
    pincode,
    employeeId,
    dateJoined,
    jobTitle,
    department,
    workLocation,
    contractType,
    paymentCycle,
    accName,
    accNumber,
    bankName,
    ifsc,
  } = req.body;

  if (
    !employeeName ||
    !email ||
    !mobile ||
    !gender ||
    !panNo ||
    !aadharNo ||
    !address ||
    !city ||
    !state ||
    !pincode ||
    !employeeId ||
    !dateJoined ||
    !jobTitle ||
    !workLocation ||
    !contractType
  ) {
    return res.respond(400, "All fields required!");
  }

  const existingEmployer = await prisma.employer.findFirst({
    where: {
      userId: userId,
    },
  });

  if (!existingEmployer) {
    return res.status(400).json({ error: "Employer not found!" });
  }

  const existingUser = await prisma.customUser.findFirst({
    where: {
      OR: [
        { email, userType },
        { mobile, userType },
      ],
    },
  });

  if (existingUser) {
    return res.respond(
      400,
      "User with this mobile number or Email already exists!"
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const newUser = await tx.customUser.create({
      data: {
        email,
        mobile,
        name: employeeName,
        userType,
      },
    });

    // ######-----Generate unique employeeId per employer-----#####
    const newEmployeeId = await generateUniqueEmployeeId(
      prisma,
      existingEmployer.employerId,
      existingEmployer.id
    );

    const employee = await tx.employee.create({
      data: {
        user: {
          connect: { id: newUser.id },
        },
        employer: {
          connect: { id: existingEmployer.id },
        },
        employeeName,
        mobile,
        email,
        dob: new Date(dob),
        maritalStatus,
        gender,
        nationality,
        panNo,
        aadharNo,
        address,
        city,
        pincode,
        employeeId,
        customEmployeeId: newEmployeeId,
        country: {
          connect: { id: country },
        },
        state: {
          connect: { id: state },
        },
      },
    });

    await tx.employmentDetails.create({
      data: {
        employee: { connect: { id: employee.id } },
        partnerEmployeeId: employeeId,
        dateJoined: new Date(dateJoined),
        jobTitle,
        department,
        employerLocationDetails: { connect: { id: workLocation } },
        employerContractType: { connect: { id: contractType } },
      },
    });

    await tx.employeeBankDetails.create({
      data: {
        employee: {
          connect: { id: employee.id },
        },
        accName,
        accNumber,
        bankName,
        ifsc,
      },
    });

    return { newUser, employee };
  });

  const { employee } = result;

  let registeredEmployee = {
    id: employee.id,
    employerId: employee.employerId,
    employeeName: employee.employeeName,
    email: employee.email,
    mobile: employee.mobile,
    dob: employee.dob,
    maritalStatus: employee.maritalStatus,
    gender: employee.gender,
    nationality: employee.nationality,
    panNo: employee.panNo,
    aadharNo: employee.aadharNo,
    address: employee.address,
    city: employee.city,
    state: employee.stateId,
    pincode: employee.pincode,
    dateJoined: employee.dateJoined,
    jobTitle: employee.jobTitle,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };

  res.respond(201, "Employee Created Successfully!", registeredEmployee);
});

// ##########----------Bulk Upload Employess From Excel----------##########
const bulkUploadEmployees = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { nationality, state } = req.body;

  if (!req.file || !req.file.path) {
    return res.respond(400, "Please upload a file.");
  }

  if (!nationality || !state) {
    return res.respond(
      400,
      "Nationality and state are required in request body!"
    );
  }

  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  const employer = await prisma.employer.findFirst({ where: { userId } });
  if (!employer) return res.respond(404, "Employer not found!");

  const baseEmployerId = String(employer.employerId).padStart(5, "0");

  let successCount = 0;
  let errorRows = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const {
      employeeName,
      mobile,
      email,
      dob,
      maritalStatus,
      gender,
      panNo,
      aadharNo,
      address,
      city,
      pincode,
      dateJoined,
      jobTitle,
    } = row;

    try {
      if (
        !employeeName ||
        !email ||
        !mobile ||
        !gender ||
        !panNo ||
        !aadharNo ||
        !address ||
        !city ||
        !pincode ||
        !dateJoined ||
        !jobTitle
      ) {
        return res.respond(400, "Missing required fields!");
      }

      const existingUser = await prisma.customUser.findFirst({
        where: { OR: [{ email }, { mobile }] },
      });
      if (existingUser) {
        return res.respond(
          400,
          "User already exists with given email or mobile!"
        );
      }

      const newUser = await prisma.customUser.create({
        data: {
          email,
          mobile,
          name: employeeName,
          userType: "EMPLOYEE",
        },
      });

      const newEmployeeId = await generateUniqueEmployeeId(
        prisma,
        employer.employerId,
        employer.id
      );

      await prisma.employee.create({
        data: {
          user: { connect: { id: newUser.id } },
          employer: { connect: { id: employer.id } },
          employeeName,
          mobile,
          email,
          dob: new Date(dob),
          maritalStatus,
          gender,
          country: { connect: { id: nationality } },
          panNo,
          aadharNo,
          address,
          city,
          state: { connect: { id: state } },
          pincode,
          employeeId: newEmployeeId,
          dateJoined: new Date(dateJoined),
          jobTitle,
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

  res.respond(201, `Bulk upload completed!`, {
    successCount,
    failedCount: errorRows.length,
    errors: errorRows,
  });
});

// ##########----------Get Employees By Employer----------##########
const getEmployeesByEmployer = asyncHandler(async (req, res) => {
  const userId = req.user;

  const employer = await prisma.employer.findFirst({
    where: { userId },
    include: {
      employees: {
        select: {
          id: true,
          employeeName: true,
          employeeId: true,
          customEmployeeId: true,
          email: true,
          mobile: true,
          alternativeMobile: true,
          gender: true,
          dob: true,
          maritalStatus: true,
          address: true,
          city: true,
          nationality: true,
          stateId: true,
          pincode: true,
          EmploymentDetails: {
            select: {
              department: true,
              jobTitle: true,
              dateJoined: true,
            },
          },
        },
      },
    },
  });

  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  res.respond(200, "Employers fetched successfully!", employer.employees);
});

// ##########----------Get Employees Profile----------##########
const getEmployeeProfile = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { employeeId } = req.params;

  const employer = await prisma.employer.findFirst({
    where: { userId },
  });

  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId },
    select: {
      id: true,
      employeeName: true,
      employeeId: true,
      customEmployeeId: true,
      email: true,
      mobile: true,
      alternativeMobile: true,
      gender: true,
      dob: true,
      maritalStatus: true,
      address: true,
      city: true,
      nationality: true,
      stateId: true,
      pincode: true,
      EmploymentDetails: {
        select: {
          department: true,
          jobTitle: true,
          dateJoined: true,
        },
      },
      EmployeeBankDetails: {
        select: {
          accName: true,
          accNumber: true,
          bankName: true,
          ifsc: true,
        },
      },
    },
  });

  res.respond(200, "Employers fetched successfully!", employee);
});

module.exports = {
  registerEmployer,
  loginEmployer,
  EmployerProfileCompletion,
  addEmployerWorkLocation,
  addEmployerCompanyPolicy,
  addEmployerContractType,
  handleEmployerActivationStatus,
  getEmployerProfile,
  deleteEmployer,
  addEmployeeByEmployer,
  bulkUploadEmployees,
  getEmployeesByEmployer,
  getAllEmployers,
  getEmployeeProfile,
  getEmployerContractTypes,
};
