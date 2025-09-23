const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyPassword,
  hashPassword,
} = require("../../../utils/authUtils");

const { UserType } = require("@prisma/client");

const prisma = new PrismaClient();

// ###############---------------Generate Access And Refresh Token---------------###############
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await prisma.customUser.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error("User not found!");
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
// ##########----------Create Employer SubAdmin----------##########
const createEmployerSubAdmin = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { name, email, mobile, password, role, modules } = req.body;
  const userType = UserType.EMPLOYERSUBADMIN;

  if (!Array.isArray(modules) || modules.length === 0) {
    return res.respond(400, "Modules must be a non-empty array.");
  }

  if (!name || !email || !mobile || !password || !role) {
    return res.respond(400, "All fields required!");
  }

  if (!mobile.match(/^[6789]\d{9}$/)) {
    return res.respond(400, "Invalid mobile number!");
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
    return res.status(400).json({
      error: "User with this mobile number or Email already exists!",
    });
  }

  const existingEmployer = await prisma.employer.findFirst({
    where: { userId },
  });
  if (!existingEmployer) {
    return res.status(400).json({
      error: "Employer not found!",
    });
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

  let registeredEmployerSubAdmin = await prisma.employerSubAdmin.create({
    data: {
      user: {
        connect: { id: createCustomUser.id },
      },
      employer: {
        connect: { id: existingEmployer.id },
      },
      name,
      email,
      mobile,
      password: hashed,
      employerRole: {
        connect: { id: role },
      },
    },
  });

  await prisma.employerSubAdminModule.createMany({
    data: modules.map((modId) => ({
      moduleId: modId,
      employerSubAdminId: registeredEmployerSubAdmin.id,
    })),
  });

  registeredEmployerSubAdmin = {
    id: registeredEmployerSubAdmin.id,
    name: registeredEmployerSubAdmin.name,
    email: registeredEmployerSubAdmin.email,
    mobile: registeredEmployerSubAdmin.mobile,
    roleId: registeredEmployerSubAdmin.role,
    createdAt: registeredEmployerSubAdmin.createdAt,
    updatedAt: registeredEmployerSubAdmin.updatedAt,
  };

  res.respond(
    201,
    "Employer SubAdmin created successfully!",
    registeredEmployerSubAdmin
  );
});

// ##########----------EmployerSubAdmin Login----------##########
const loginEmployerSubAdmin = asyncHandler(async (req, res) => {
  const { userType = "EMPLOYERSUBADMIN", email, password } = req.body;

  if (!email || !password) {
    return res.respond(400, "All fields required!");
  }

  const existingUser = await prisma.customUser.findFirst({
    where: { email, userType },
  });

  if (!existingUser) {
    return res.respond(400, "User not found!");
  }

  const existingEmployerSubAdmin = await prisma.employerSubAdmin.findFirst({
    where: { email },
  });

  if (!existingEmployerSubAdmin) {
    return res.respond(400, "EmployerSubAdmin not found!");
  }

  const isMatch = await verifyPassword(
    password,
    existingEmployerSubAdmin.password
  );

  if (!isMatch) {
    return res.respond(400, "Invalid Credentials!");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    existingUser.id
  );

  const user = {
    id: existingEmployerSubAdmin.id,
    name: existingEmployerSubAdmin.name,
    email: existingEmployerSubAdmin.email,
    mobile: existingEmployerSubAdmin.mobile,
    userType: existingUser.userType,
  };

  // #####-----Log EmployerSubAdmin Login Activity-----#####
  await prisma.employerActivityLogs.create({
    data: {
      employerSubAdminId: existingEmployerSubAdmin.id,
      employerId: existingEmployerSubAdmin.employerId,
      action: `${existingEmployerSubAdmin.name} logged In!`,
      deviceIp: req.ip,
    },
  });

  res.respond(200, "Associate Logged In successfully!", {
    user,
    accessToken,
    refreshToken,
  });
});

// ##########----------Update Employer SubAdmin----------##########
const updateEmployerSubAdmin = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { subAdminId } = req.params;
  const { name, mobile, role, modules } = req.body;

  const existingSubAdmin = await prisma.employerSubAdmin.findUnique({
    where: { id: subAdminId },
    include: { user: true },
  });

  if (!existingSubAdmin) {
    return res.respond(404, "Employer SubAdmin not found!");
  }

  const existingEmployer = await prisma.employer.findFirst({
    where: { userId },
  });

  if (!existingEmployer) {
    return res.respond(400, "Employer not found!");
  }

  if (mobile && !mobile.match(/^[6789]\d{9}$/)) {
    return res.respond(400, "Invalid mobile number!");
  }

  if (name || mobile) {
    await prisma.customUser.update({
      where: { id: existingSubAdmin.userId },
      data: {
        ...(name && { name }),
        ...(mobile && { mobile }),
      },
    });
  }

  await prisma.employerSubAdmin.update({
    where: { id: subAdminId },
    data: {
      ...(name && { name }),
      ...(mobile && { mobile }),
      ...(role && { roleId: role }),
    },
  });

  if (Array.isArray(modules)) {
    await prisma.employerSubAdminModule.deleteMany({
      where: { employerSubAdminId: subAdminId },
    });

    await prisma.employerSubAdminModule.createMany({
      data: modules.map((modId) => ({
        moduleId: modId,
        employerSubAdminId: subAdminId,
      })),
    });
  }

  res.respond(200, "Employer SubAdmin updated successfully!");
});

// ##########----------Update Employer SubAdmin Active Status----------##########
const updateEmployerSubAdminActiveStatus = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { subAdminId } = req.params;
  const { isActive } = req.body;

  const existingSubAdmin = await prisma.employerSubAdmin.findUnique({
    where: { id: subAdminId },
    include: { user: true },
  });

  if (!existingSubAdmin) {
    return res.respond(404, "Employer SubAdmin not found!");
  }

  const existingEmployer = await prisma.employer.findFirst({
    where: { userId },
  });

  if (!existingEmployer) {
    return res.respond(400, "Employer not found!");
  }

  await prisma.employerSubAdmin.update({
    where: { id: subAdminId },
    data: {
      isActive
    },
  });

  res.respond(200, "Employer SubAdmin active updated successfully!");
});

// ##########----------Get All Employer SubAdmins by Employer----------##########
const getEmployerSubAdminsByEmployer = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { page = 1, limit = 10, search = "" } = req.query;

  const employer = await prisma.employer.findFirst({
    where: { userId, isDeleted: false },
  });

  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  const whereClause = {
    employerId: employer.id,
    isDeleted: false,
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { mobile: { contains: search, mode: "insensitive" } },
    ],
  };

  const totalCount = await prisma.employerSubAdmin.count({
    where: whereClause,
  });

  const employerSubAdmins = await prisma.employerSubAdmin.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          mobile: true,
        },
      },
      employerRole: {
        select: {
          id: true,
          roleName: true,
        },
      },
      employerSubAdminModule: {
        where: { isDeleted: false },
        include: {
          employerModule: {
            select: {
              id: true,
              moduleName: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
  });

  const result = employerSubAdmins.map((subAdmin) => ({
    id: subAdmin.id,
    name: subAdmin.name,
    email: subAdmin.email,
    mobile: subAdmin.mobile,
    role: subAdmin.employerRole,
    modules: subAdmin.employerSubAdminModule.map((m) => m.employerModule),
    isActive: subAdmin.isActive,
    createdAt: subAdmin.createdAt,
    updatedAt: subAdmin.updatedAt,
  }));

  res.respond(200, "Employer SubAdmins fetched successfully!", {
    totalCount,
    page: parseInt(page),
    limit: parseInt(limit),
    data: result,
  });
});

// ##########----------Delete EmployerSubAdmin----------##########
const deleteEmployerSubAdmin = asyncHandler(async (req, res) => {
  const userId = req.user;

  const employerSubAdmin = await prisma.employerSubAdmin.findFirst({
    where: { userId },
  });

  if (!employerSubAdmin) {
    return res.respond(404, "EmployerSubAdmin not found!");
  }

  await prisma.employerSubAdmin.update({
    where: { id: employerSubAdmin.id },
    data: { isDeleted: true },
  });

  res.respond(200, "EmployerSubAdmin deleted successfully!");
});

// ##########----------Delete Employer SubAdmin By Employer----------##########
const deleteSubAdminByEmployer = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { subAdminId } = req.params;

  const employer = await prisma.employer.findFirst({
    where: { userId },
  });

  if (!employer) {
    return res.respond(404, "Employer not found!");
  }

  await prisma.employerSubAdmin.update({
    where: { id: subAdminId },
    data: { isDeleted: true },
  });

  res.respond(200, "Employer SubAdmin deleted successfully!");
});

module.exports = {
  createEmployerSubAdmin,
  loginEmployerSubAdmin,
  updateEmployerSubAdmin,
  updateEmployerSubAdminActiveStatus,
  getEmployerSubAdminsByEmployer,
  deleteEmployerSubAdmin,
  deleteSubAdminByEmployer
};
