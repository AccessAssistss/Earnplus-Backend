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
      role,
    },
  });

  await prisma.employerSubAdminModule.createMany({
    data: modules.map((mod) => ({
      module: mod,
      employerSubAdminId: registeredEmployerSubAdmin.id,
    })),
  });

  registeredEmployerSubAdmin = {
    id: registeredEmployerSubAdmin.id,
    name: registeredEmployerSubAdmin.name,
    email: registeredEmployerSubAdmin.email,
    mobile: registeredEmployerSubAdmin.mobile,
    role: registeredEmployerSubAdmin.role,
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
      ...(role && { role }),
    },
  });

  if (Array.isArray(modules)) {
    await prisma.employerSubAdminModule.deleteMany({
      where: { employerSubAdminId: subAdminId },
    });

    await prisma.employerSubAdminModule.createMany({
      data: modules.map((mod) => ({
        module: mod,
        employerSubAdminId: subAdminId,
      })),
    });
  }

  res.respond(200, "Employer SubAdmin updated successfully!");
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

module.exports = {
  createEmployerSubAdmin,
  loginEmployerSubAdmin,
  updateEmployerSubAdmin,
  deleteEmployerSubAdmin,
};
