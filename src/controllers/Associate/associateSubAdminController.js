const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyPassword,
  generateRandomPassword,
} = require("../../../utils/authUtils");

const { UserType } = require("@prisma/client");
const { verifyGST, verifyPAN } = require("../../../utils/verificationUtils");
const { generateUniqueEmployerId } = require("../../../utils/uniqueCodeGenerator");

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
// ##########----------Create Associate SubAdmin----------##########
const createAssociateSubAdmin = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { name, email, mobile, password, role, modules } = req.body;
  const userType = UserType.ASSOCIATESUBADMIN;

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

  const existingAssociate = await prisma.associate.findFirst({
    where: { userId },
  });

  if (!existingAssociate) {
    return res.status(400).json({
      error: "Associate not found!",
    });
  }

  const existingRole = await prisma.role.findFirst({
    where: { id: role },
  });

  if (!existingRole) {
    return res.status(404).json({
      error: "Role not found!",
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

  let registeredAssociateSubAdmin = await prisma.associateSubAdmin.create({
    data: {
      user: {
        connect: { id: createCustomUser.id },
      },
      associate: {
        connect: { id: existingAssociate.id },
      },
      name,
      email,
      mobile,
      password: hashed,
      role: {
        connect: { id: existingRole.id },
      },
    },
  });

  await prisma.associateSubAdminModule.createMany({
    data: modules.map((mod) => ({
      moduleId: mod,
      associateSubAdminId: registeredAssociateSubAdmin.id,
    })),
  });

  registeredAssociateSubAdmin = {
    id: registeredAssociateSubAdmin.id,
    name: registeredAssociateSubAdmin.name,
    email: registeredAssociateSubAdmin.email,
    mobile: registeredAssociateSubAdmin.mobile,
    role: registeredAssociateSubAdmin.role,
    createdAt: registeredAssociateSubAdmin.createdAt,
    updatedAt: registeredAssociateSubAdmin.updatedAt,
  };

  res.respond(
    201,
    "Associate SubAdmin created successfully!",
    registeredAssociateSubAdmin
  );
});

// ##########----------Associate SubAdmin Login----------##########
const loginAssociateSubAdmin = asyncHandler(async (req, res) => {
  const { userType = "ASSOCIATESUBADMIN", email, password } = req.body;

  if (!email || !password) {
    return res.respond(400, "All fields required!");
  }

  const existingUser = await prisma.customUser.findFirst({
    where: { email, userType },
  });

  if (!existingUser) {
    return res.respond(400, "User not found!");
  }

  const existingSubAdmin = await prisma.associateSubAdmin.findFirst({
    where: { email },
  });

  if (!existingSubAdmin) {
    return res.respond(400, "SubAdmin not found!");
  }

  if (!existingSubAdmin.isActive) {
    return res.respond(
      403,
      "SubAdmin account is deactivated. Please contact your associate."
    );
  }

  const isMatch = await verifyPassword(password, existingSubAdmin.password);

  if (!isMatch) {
    return res.respond(401, "Invalid Credentials!");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    existingUser.id
  );

  const user = {
    id: existingSubAdmin.id,
    name: existingSubAdmin.name,
    email: existingSubAdmin.email,
    mobile: existingSubAdmin.mobile,
    role: existingUser.role,
  };

  res.respond(201, "SubAdmin Logged In successfully!", {
    user,
    accessToken,
    refreshToken,
  });
});

// ##########----------Update Associate SubAdmin----------##########
const updateAssociateSubAdmin = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { subAdminId } = req.params;
  const { name, mobile, role, modules } = req.body;

  const associateSubAdmin = await prisma.associateSubAdmin.findUnique({
    where: { id: subAdminId },
    include: { user: true },
  });

  if (!associateSubAdmin) {
    return res.respond(404, "Associate SubAdmin not found.");
  }

  const existingAssociate = await prisma.associate.findFirst({
    where: { userId },
  });

  if (!existingAssociate) {
    return res.respond(400, "Associate not found.");
  }

  const userUpdateData = {};
  const subAdminUpdateData = {};

  if (name) {
    userUpdateData.name = name;
    subAdminUpdateData.name = name;
  }

  if (mobile) {
    if (!mobile.match(/^[6789]\d{9}$/)) {
      return res.respond(400, "Invalid mobile number!");
    }
    userUpdateData.mobile = mobile;
    subAdminUpdateData.mobile = mobile;
  }

  if (role) {
    const existingRole = await prisma.role.findUnique({
      where: { id: role },
    });

    if (!existingRole) {
      return res.respond(404, "Role not found.");
    }

    subAdminUpdateData.role = { connect: { id: existingRole.id } };
  }

  if (Object.keys(userUpdateData).length > 0) {
    await prisma.customUser.update({
      where: { id: associateSubAdmin.userId },
      data: userUpdateData,
    });
  }

  if (Object.keys(subAdminUpdateData).length > 0) {
    await prisma.associateSubAdmin.update({
      where: { id: subAdminId },
      data: subAdminUpdateData,
    });
  }

  if (Array.isArray(modules)) {
    await prisma.associateSubAdminModule.deleteMany({
      where: { associateSubAdminId: subAdminId },
    });

    if (modules.length > 0) {
      await prisma.associateSubAdminModule.createMany({
        data: modules.map((mod) => ({
          moduleId: mod,
          associateSubAdminId: subAdminId,
        })),
      });
    }
  }

  res.respond(200, "Associate SubAdmin updated successfully.");
});

// ##########----------Deactivate Associate SubAdmin----------##########
const deactivateAssociateSubAdmin = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { subAdminId } = req.params;
  const { isActive } = req.body;

  const associate = await prisma.associate.findFirst({
    where: { userId },
  });

  if (!associate) {
    return res.respond(404, "Associate not found!");
  }

  const subAdmin = await prisma.associateSubAdmin.findUnique({
    where: { id: subAdminId },
  });

  if (!subAdmin) {
    return res.respond(404, "Associate SubAdmin not found!");
  }

  await prisma.associateSubAdmin.update({
    where: { id: subAdminId },
    data: {
      isActive,
    },
  });

  res.respond(200, "Associate SubAdmin deactivated successfully.", isActive);
});

// ##########----------Get Associate SubAdmins----------##########
const getAssociateSubAdmins = asyncHandler(async (req, res) => {
  const userId = req.user;
  const {
    page = 1,
    limit = 10,
    search = '',
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const associate = await prisma.associate.findFirst({
    where: { userId },
  });

  if (!associate) {
    return res.respond(404, "Associate not found!");
  }

  const where = {
    OR: search
      ? [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
      ]
      : undefined,
  };

  const [subAdmins, totalCount] = await Promise.all([
    prisma.associateSubAdmin.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        isActive: true,
        isDeleted: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.associateSubAdmin.count({ where }),
  ]);

  res.respond(200, "Sub-admins fetched successfully!", {
    total: totalCount,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(totalCount / limit),
    data: subAdmins,
  },);
});

// ##########----------Add Employer By Associate SubAdmin----------##########
const addEmployerByAssociateSubAdmin = asyncHandler(async (req, res) => {
  const user = req.user;
  const {
    userType = "EMPLOYER",
    email,
    name,
    mobile,
    gst,
    pan,
    cin,
    legalIdentity,
  } = req.body;

  if (!email || !mobile || !name || !gst || !pan || !legalIdentity) {
    return res.respond(400, "All fields required!");
  }

  const existingSubAdmin = await prisma.associateSubAdmin.findFirst({
    where: {
      userId: user,
    },
    include: {
      role: {
        select: {
          id: true,
          roleName: true,
        },
      },
    },
  });

  if (!existingSubAdmin) {
    return res.respond(400, "SubAdmin not found!");
  }

  if (existingSubAdmin.role.roleName !== "ERM") {
    return res.respond(400, "You don't have access to Add Employer!");
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

  const newUser = await prisma.customUser.create({
    data: {
      email,
      mobile,
      name,
      userType,
    },
  });

  // ######-----Generate Unique employerId-----#####
  const newEmployerId = await generateUniqueEmployerId()

  const password = generateRandomPassword(8);

  const hashed = await hashPassword(password);

  const signedMasterAgreementFile = req.files?.signedMasterAgreement?.[0];
  const kycDocumentsFile = req.files?.kycDocuments?.[0];
  const boardResolutionFile = req.files?.boardResolution?.[0];
  const onboardingSOPFile = req.files?.onboardingSOP?.[0];
  const additionalDocFile = req.files?.additionalDoc?.[0];

  const signedMasterAgreementUrl = signedMasterAgreementFile
    ? `/uploads/employer/master_agreement/${signedMasterAgreementFile.filename}`
    : null;

  const kycDocumentsUrl = kycDocumentsFile
    ? `/uploads/employer/kyc_documents/${kycDocumentsFile.filename}`
    : null;

  const boardResolutionUrl = boardResolutionFile
    ? `/uploads/employer/board_resolution/${boardResolutionFile.filename}`
    : null;

  const onboardingSOPUrl = onboardingSOPFile
    ? `/uploads/employer/onboarding_sop/${onboardingSOPFile.filename}`
    : null;

  const additionalDocUrl = additionalDocFile
    ? `/uploads/employer/additional_doc/${additionalDocFile.filename}`
    : null;

  const employer = await prisma.employer.create({
    data: {
      user: {
        connect: { id: newUser.id },
      },
      associateSubAdmin: {
        connect: { id: existingSubAdmin.id },
      },
      email,
      mobile,
      name,
      password: hashed,
      gst,
      pan,
      cin,
      legalIdentity,
      employerId: newEmployerId,
      signedMasterAgreement: signedMasterAgreementUrl,
      kycDocuments: kycDocumentsUrl,
      boardResolution: boardResolutionUrl,
      onboardingSOP: onboardingSOPUrl,
      additionalDoc: additionalDocUrl,
    },
  });

  let registeredEmployer = {
    id: employer.id,
    associateSubAdminId: employer.associateSubAdminId,
    employerId: employer.employerId,
    name: employer.name,
    email: employer.email,
    mobile: employer.mobile,
    legalIdentity: employer.legalIdentity,
    createdAt: employer.createdAt,
    updatedAt: employer.updatedAt,
  };

  res.respond(201, "Employer Created Successfully!", registeredEmployer);
});

// ##########----------Verify gst and pan of Employer----------##########
const verifyGSTAndPAN = asyncHandler(async (req, res) => {
  const user = req.user;
  const { filterType, gst, businessName, pan } = req.body;

  if (!filterType) {
    return res.respond(400, "Filter type is required!");
  }

  if (!["gst", "pan"].includes(filterType)) {
    return res.respond(400, "Invalid filter type!");
  }

  const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
    where: { userId: user },
  });

  if (!associateSubAdmin) {
    return res.respond(400, "SubAdmin not found!");
  }

  if (filterType === "gst") {
    const verificationResponse = await verifyGST(gst, businessName);

    if (verificationResponse.success) {
      return res.status(200).json({
        status: true,
        message: verificationResponse.message,
        gstin: verificationResponse.gstin,
        businessName: verificationResponse.business_name,
      });
    } else {
      res.respond(
        verificationResponse.status_code || 400,
        "gst verification failed!",
        verificationResponse.error
      );
    }
  } else if (filterType === "pan") {
    const verificationResponse = await verifyPAN(pan, businessName);

    if (verificationResponse.success) {
      res.respond(200, "Pan verified successfully!", {
        pan: verificationResponse.pan,
        type: verificationResponse.type,
        referenceId: verificationResponse.reference_id,
        nameProvided: verificationResponse.name_provided,
        registeredName: verificationResponse.registered_name,
        message: verificationResponse.message,
      });
    } else {
      res.respond(
        verificationResponse.status_code || 400,
        "pan verification failed!",
        verificationResponse.error
      );
    }
  }
});

// ##########----------Get Employer By Associate SubAdmin----------##########
const getEmployersByAssociateSubAdmin = asyncHandler(async (req, res) => {
  const userId = req.user;

  const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
    where: { userId },
    include: {
      Employer: {
        select: {
          id: true,
          employerId: true,
          name: true,
          email: true,
          mobile: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!associateSubAdmin) {
    return res.respond(404, "SubAdmin not found!");
  }

  res.respond(
    200,
    "Employers fetched successfully!",
    associateSubAdmin.Employer
  );
});

// ##########----------Employer Details----------##########
const getEmployerDetails = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { employerId } = req.params;

  const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
    where: { userId },
  });

  if (!associateSubAdmin) {
    return res.respond(404, "SubAdmin not found!");
  }

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
      id: employerId,
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

  res.respond(200, "Employer Details fetched successfully!", employer);
});

// ##########----------Delete Associate SubAdmin----------##########
const deleteAssociateSubAdmin = asyncHandler(async (req, res) => {
  const userId = req.user;

  const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
    where: { userId },
  });

  if (!associateSubAdmin) {
    return res.respond(404, "SubAdmin not found!");
  }

  await prisma.associateSubAdmin.update({
    where: { id: associateSubAdmin.id },
    data: { isDeleted: true },
  });

  res.respond(200, "SubAdmin deleted successfully!");
});

// ##########----------Delete Associate SubAdmin By Associate----------##########
const deleteAssociateSubAdminByAssociate = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const associateSubAdmin = await prisma.associateSubAdmin.findFirst({
    where: { id: userId },
  });

  if (!associateSubAdmin) {
    return res.respond(404, "SubAdmin not found!");
  }

  await prisma.associateSubAdmin.update({
    where: { id: associateSubAdmin.id },
    data: { isDeleted: true },
  });

  res.respond(200, "SubAdmin deleted successfully!");
});

module.exports = {
  createAssociateSubAdmin,
  loginAssociateSubAdmin,
  updateAssociateSubAdmin,
  deactivateAssociateSubAdmin,
  getAssociateSubAdmins,
  addEmployerByAssociateSubAdmin,
  verifyGSTAndPAN,
  getEmployersByAssociateSubAdmin,
  getEmployerDetails,
  deleteAssociateSubAdmin,
  deleteAssociateSubAdminByAssociate
};
