const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyPassword,
  generateRandomPassword,
} = require("../../../utils/authUtils");
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
// ##########----------Associate Registration----------##########
const registerAssociate = asyncHandler(async (req, res) => {
  const { userType = "ASSOCIATE", email, mobile, password, name } = req.body;

  if (!email || !mobile || !password || !name) {
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
      error: "User with this mobile number or Email already exists",
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

  let registeredAssociate = await prisma.associate.create({
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

  registeredAssociate = {
    id: registeredAssociate.id,
    name: registeredAssociate.name,
    email: registeredAssociate.email,
    mobile: registeredAssociate.mobile,
    createdAt: registeredAssociate.createdAt,
    updatedAt: registeredAssociate.updatedAt,
  };

  res.respond(201, "Associate registered successfully!", registeredAssociate);
});

// ##########----------Associate Login----------##########
const loginAssociate = asyncHandler(async (req, res) => {
  const { userType = "ASSOCIATE", email, password } = req.body;

  if (!email || !password) {
    return res.respond(400, "All fields required!");
  }

  const existingUser = await prisma.customUser.findFirst({
    where: { email, userType },
  });

  if (!existingUser) {
    return res.respond(400, "User not found!");
  }

  const existingAssociate = await prisma.associate.findFirst({
    where: { email },
  });

  if (!existingAssociate) {
    return res.respond(400, "Associate not found!");
  }

  const isMatch = await verifyPassword(password, existingAssociate.password);

  if (!isMatch) {
    return res.respond(401, "Invalid Credentials!");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    existingUser.id
  );

  const user = {
    id: existingAssociate.id,
    name: existingAssociate.name,
    email: existingAssociate.email,
    mobile: existingAssociate.mobile,
    userType: existingUser.userType,
  };

  res.respond(201, "Associate Logged In successfully!", {
    user,
    accessToken,
    refreshToken,
  });
});

// ##########----------Change Associate Password----------##########
const changeAssociatePassword = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.respond(400, "Both current and new passwords are required!");
  }

  const associate = await prisma.associate.findFirst({
    where: { userId },
  });

  if (!associate) {
    return res.respond(404, "Associate not found!");
  }

  const isMatch = await verifyPassword(currentPassword, associate.password);

  if (!isMatch) {
    return res.respond(401, "Current password is incorrect!");
  }

  const hashedNewPassword = await hashPassword(newPassword);

  await prisma.associate.update({
    where: { id: associate.id },
    data: {
      password: hashedNewPassword,
    },
  });

  res.respond(200, "Password changed successfully!");
});

// ##########----------Add Employer By Associate----------##########
const addEmployerByAssociate = asyncHandler(async (req, res) => {
  const user = req.user;

  const { userType = "EMPLOYER", email, name, mobile, gst, pan, approvalEmail } = req.body;

  if (!email || !mobile || !name || !gst || !pan) {
    return res.respond(400, "All fields required!");
  }

  const existingAssociate = await prisma.associate.findFirst({
    where: {
      userId: user,
    },
  });

  if (!existingAssociate) {
    return res.status(400).json({ error: "Associate not found!" });
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

  const signedMasterAgreementUrl = signedMasterAgreementFile
    ? `/uploads/employer/master_agreement/${signedMasterAgreementFile.filename}`
    : null;

  const kycDocumentsUrl = kycDocumentsFile
    ? `/uploads/employer/kyc_documents/${kycDocumentsFile.filename}`
    : null;
    
  const employer = await prisma.employer.create({
    data: {
      user: {
        connect: { id: newUser.id },
      },
      associate: {
        connect: { id: existingAssociate.id },
      },
      email,
      mobile,
      name,
      password: hashed,
      gst,
      pan,
      employerId: newEmployerId,
      signedMasterAgreement: signedMasterAgreementUrl,
      kycDocuments: kycDocumentsUrl,
      approvalEmail
    },
  });

  let registeredEmployer = {
    id: employer.id,
    associateId: employer.associateId,
    employerId: employer.employerId,
    name: employer.name,
    email: employer.email,
    mobile: employer.mobile,
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

  const associate = await prisma.associate.findFirst({
    where: { userId: user },
  });

  if (!associate) {
    return res.respond(400, "Associate not found!");
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

// ##########----------Get Employer By Associate----------##########
const getEmployersByAssociate = asyncHandler(async (req, res) => {
  const userId = req.user;

  const associate = await prisma.associate.findFirst({
    where: { userId },
    include: {
      employers: {
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

  if (!associate) {
    return res.respond(404, "Associate not found!");
  }

  res.respond(200, "Employers fetched successfully!", associate.employers);
});

// ##########----------Employer Details----------##########
const getEmployerDetails = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { employerId } = req.params;

  const associate = await prisma.associate.findFirst({
    where: { userId },
  });

  if (!associate) {
    return res.respond(404, "Associate not found!");
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

// ##########----------Delete Associate----------##########
const deleteAssociate = asyncHandler(async (req, res) => {
  const userId = req.user;

  const associate = await prisma.associate.findFirst({
    where: { userId },
  });

  if (!associate) {
    return res.respond(404, "Associate not found!");
  }

  await prisma.associate.update({
    where: { id: associate.id },
    data: { isDeleted: true },
  });

  res.respond(200, "Associate deleted successfully!");
});

module.exports = {
  registerAssociate,
  loginAssociate,
  changeAssociatePassword,
  addEmployerByAssociate,
  verifyGSTAndPAN,
  getEmployersByAssociate,
  getEmployerDetails,
  deleteAssociate,
};
