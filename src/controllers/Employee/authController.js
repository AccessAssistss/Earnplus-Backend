const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  generateOTP,
  sendOTP,
  validateOTP,
} = require("../../../utils/otpUtils");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../../../utils/authUtils");
const {
  sendAadhaarOtp,
  verifyAadhaarOtp,
  verifyPAN,
  checkPanStatus,
  verifySelfie,
} = require("../../../utils/verificationUtils");
const { crifReportCustomer } = require("../../../utils/proxyUtils");
const { formatDateTime } = require("../../../utils/dateFormatter");

const prisma = new PrismaClient();

// ###############---------------Generate Access And Refresh Token---------------###############
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await prisma.customUser.findFirst({ where: { id: userId } });

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
const STATIC_OTP = "123456";
const TEST_MOBILE = "999999999";
// ##########----------Send OTP To Employee----------##########
const sendUserOTP = asyncHandler(async (req, res) => {
  const { userType = "EMPLOYEE", mobile } = req.body;

  if (!mobile) {
    return res.respond(400, "Mobile is required!");
  }

  const otp = mobile === TEST_MOBILE ? STATIC_OTP : await generateOTP();

  let user = await prisma.customUser.findFirst({
    where: {
      userType,
      OR: [{ mobile }, { alternativeMobile: mobile }],
    },
  });

  const isExistingUser = Boolean(user);

  if (!user) {
    user = await prisma.customUser.create({
      data: {
        mobile,
        userType,
      },
    });
  }

  let employee = await prisma.employee.findFirst({
    where: { userId: user.id },
  });

  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        userId: user.id,
        mobile,
        otp,
        otpExpiration: new Date(),
      },
    });
  } else {
    if (employee.accountStatus === "BLOCKED") {
      return res.respond(403, "Your account is blocked. Contact support.");
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        otp,
        otpExpiration: new Date(),
      },
    });
  }

  const sent = await sendOTP(mobile, otp);
  if (!sent) {
    return res.respond(500, "Failed to send OTP");
  }
  res.respond(200, `OTP sent to ${mobile}!`, { otp, isExistingUser });
});

// ##########----------Verify Employee OTP----------##########
const verifyOTP = asyncHandler(async (req, res) => {
  const { mobile, otp, userType = "EMPLOYEE" } = req.body;
  if (!mobile || !otp || !userType) {
    return res.respond(400, "Mobile, OTP, and userType required!");
  }

  if (mobile === TEST_MOBILE.toString() && otp === STATIC_OTP.toString()) {
    let user = await prisma.customUser.findFirst({
      where: { mobile, userType },
    });
    if (!user) {
      user = await prisma.customUser.create({
        data: { mobile, userType },
      });
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: user.id },
    });

    if (!employee) {
      employee = await prisma.employee.create({
        data: {
          userId: user.id,
          mobile,
          accountStatus: "ACTIVE",
        },
      });
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user.id);

    return res.respond(200, `OTP verified successfully (test user)!`, {
      isEmployerLinked: employee.isEmployerLinked,
      isExistingUser: employee.isExistingUser,
      accessToken,
      refreshToken,
    });
  }

  const user = await prisma.customUser.findFirst({
    where: {
      userType,
      OR: [{ mobile }, { alternativeMobile: mobile }],
    },
  });
  if (!user) {
    return res.respond(404, "User not found!");
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: user.id },
  });
  if (!employee) {
    return res.respond(404, "Employee profile not found!");
  }

  if (employee.otp !== otp) {
    return res.respond(400, "Invalid OTP!");
  }

  const isOtpExpired = await validateOTP(employee.otpExpiration);
  if (isOtpExpired) {
    return res.respond(404, "OTP has Expired!");
  }

  if (employee.accountStatus === "BLOCKED") {
    return res.respond(403, "Your account is blocked. Contact support.");
  }
  if (employee.accountStatus === "INACTIVE") {
    return res.respond(403, "Your account is inactive. Please request activation.");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user.id);

  await prisma.employeeAccountStatusRequest.updateMany({
    where: {
      employeeId: employee.id,
      requestType: "INACTIVATE",
      status: "PENDING",
      cancelledAt: null,
    },
    data: {
      cancelledAt: new Date(),
      status: "REJECTED",
      reviewRemark: "User logged in during grace period",
    },
  });


  res.respond(200, `OTP verified successfully!`, {
    isEmployerLinked: employee.isEmployerLinked,
    isExistingUser: employee.isExistingUser,
    accessToken,
    refreshToken,
  });
});

// ##########----------Register Employee----------##########
const RegisterEmployee = asyncHandler(async (req, res) => {
  const user = req.user;

  const {
    employeeName,
    dob,
    gender,
    employmentType,
    educationLevel,
    maritalStatus,
    email,
    designation,
    country,
    state,
    pincode,
  } = req.body;

  if (!employeeName ||
    !dob ||
    !gender ||
    !employmentType ||
    !maritalStatus ||
    !email ||
    !designation ||
    !country ||
    !state ||
    !pincode) {
    return res.respond(400, "All Fields required!");
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: user },
  });

  if (!employee) {
    return res.respond(404, "Employee not found!");
  }

  const updatedEmployee = await prisma.employee.update({
    where: { id: employee.id },
    data: {
      employeeName,
      dob: new Date(dob),
      gender,
      employmentType,
      educationLevel,
      maritalStatus,
      email,
      designation,
      country: { connect: { id: country } },
      state: { connect: { id: state } },
      pincode,
      isExistingUser: true,
    },
  });

  res.respond(200, `Employee registered successfully!`, updatedEmployee);
});

// ##########----------Update Employee Profile----------##########
const updateEmployeeProfile = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { employeeName, dob, gender, employmentType, educationLevel, maritalStatus, email, designation } = req.body;

  const employee = await prisma.employee.findFirst({
    where: { userId }
  })
  if (!employee) {
    return res.respond(400, "Employee not found!")
  }

  const updateData = {};

  if (employeeName !== undefined) updateData.employeeName = employeeName;
  if (dob !== undefined) updateData.dob = new Date(dob);
  if (gender !== undefined) updateData.gender = gender;
  if (employmentType !== undefined) updateData.employmentType = employmentType;
  if (educationLevel !== undefined) updateData.educationLevel = educationLevel;
  if (maritalStatus !== undefined) updateData.maritalStatus = maritalStatus;
  if (email !== undefined) updateData.email = email;
  if (designation !== undefined) updateData.designation = designation;

  const updatedEmployee = await prisma.employee.update({
    where: { id: employee.id },
    data: updateData
  });

  res.respond(200, "Employee Profile Updated successfully!", updatedEmployee)
})

// ##########----------Get Employee Profile----------##########
const getEmployeeProfile = asyncHandler(async (req, res) => {
  const userId = req.user;

  const employee = await prisma.employee.findFirst({
    where: { userId },
    select: {
      id: true,
      employeeName: true,
      dob: true,
      gender: true,
      employmentType: true,
      educationLevel: true,
      maritalStatus: true,
      email: true,
      designation: true,
      country: {
        select: {
          id: true,
          countryName: true,
        }
      },
      state: {
        select: {
          id: true,
          stateName: true,
        }
      },
      pincode: true
    }
  })

  res.respond(200, `Employee's profile fetched successfully!`, employee);
})

// ##########----------Add Employee Bank Accounts----------##########
const addEmployeeBank = asyncHandler(async (req, res) => {
  const userId = req.user
  const { accName, accNumber, bankName, ifsc } = req.body;

  if (!accName || !accNumber || !bankName || !ifsc) {
    return res.respond(400, "All fields required!")
  }

  const employee = await prisma.employee.findFirst({
    where: { userId }
  })
  if (!employee) {
    return res.respond(404, "Employee not found!")
  }

  const bankDetails = await prisma.employeeBankDetails.create({
    data: {
      employee: { connect: { id: employee.id } },
      accName,
      accNumber,
      bankName,
      ifsc,
    },
  });

  res.respond(201, "Bank account added successfully!", bankDetails);
})

// ##########----------Get Employee Bank Accounts----------##########
const getEmployeeBanks = asyncHandler(async (req, res) => {
  const userId = req.user;

  const employee = await prisma.employee.findFirst({
    where: { userId },
  });

  if (!employee) {
    return res.respond(404, "Employee not found!");
  }

  const bankAccounts = await prisma.employeeBankDetails.findMany({
    where: {
      employeeId: employee.id,
      isDeleted: false,
    },
    orderBy: { createdAt: "desc" },
  });

  res.respond(200, "Bank accounts fetched successfully!", bankAccounts);
});

// ##########----------Verify Employee Partnership with Employer----------##########
const verifyEmployeeEmployerLink = asyncHandler(async (req, res) => {
  const { employerId, employeeId, mobile } = req.body;
  if (!employerId || !employeeId) {
    return res.respond(400, "Employer ID and Employee ID is required!");
  }

  const employee = await prisma.employee.findFirst({
    where: { employeeId, employerId },
  });
  if (!employee) {
    return res.respond(
      400,
      "Employee with this Employer ID and Employee ID does not exist!"
    );
  }

  const updateData = {
    isEmployerScreen: true,
  };

  if (employee.mobile !== mobile && !employee.alternativeMobile) {
    updateData.alternativeMobile = mobile;
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: updateData,
  });

  res.respond(200, `Employee Link with Employer verified successfully!`, {
    employeeName: employee.employeeName,
    employeeId: employee.employeeId,
  });
});

// ##########----------Send aadhar OTP----------##########
const handleSendAadhaarOtp = asyncHandler(async (req, res) => {
  const user = req.user;
  const { aadhaarNumber } = req.body;
  if (!aadhaarNumber) {
    return res.respond(400, "Aadhaar number is required!");
  }

  const employee = await prisma.employee.findUnique({
    where: { userId: user },
  });
  if (!employee) {
    return res.respond(400, "Employee not found!");
  }

  const verification = await prisma.employeeVerification.upsert({
    where: {
      employeeId: employee.id,
    },
    update: {
      aadharNumber: aadhaarNumber,
    },
    create: {
      employeeId: employee.id,
      aadharNumber: aadhaarNumber,
    },
  });

  const otpResponse = await sendAadhaarOtp(aadhaarNumber);

  if (otpResponse.success) {
    return res.respond(200, "success!", {
      status: otpResponse.status,
      message: otpResponse.message,
      refId: otpResponse.refId,
    });
  } else {
    return res.respond(
      otpResponse.statusCode,
      "something went wrong!",
      otpResponse.error
    );
  }
});

// ##########----------Verify Aadhar OTP----------##########
const handleVerifyAadhaarOtp = asyncHandler(async (req, res) => {
  const user = req.user;
  const { refId, otp } = req.body;
  if (!refId || !otp) {
    return res.respond(400, "Reference ID and OTP are required!");
  }

  const employee = await prisma.employee.findUnique({
    where: { userId: user },
  });
  if (!employee) {
    return res.respond(404, "Employee not found!");
  }

  const verification = await prisma.employeeVerification.findFirst({
    where: { employeeId: employee.id },
  });
  if (!verification) {
    return res.respond(404, "Verification record not found!");
  }

  const result = await verifyAadhaarOtp(otp, refId);

  if (result.success) {
    await prisma.employeeVerification.update({
      where: { id: verification.id },
      data: { isAadharVerified: true },
    });

    return res.respond(200, "Aadhaar verification successful!", {
      refId: result.refId,
      finalStatus: result.status,
      finalMessage: result.message,
    });
  } else {
    return res.respond(
      result.statusCode,
      "something went wrong!",
      result.error
    );
  }
});

const verifyEmployeePan = asyncHandler(async (req, res) => {
  const user = req.user;
  const { name, pan } = req.body;
  if (!name || !pan) {
    return res.respond(400, "Name and PAN are required!");
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: user.id },
  });
  if (!employee) {
    return res.respond(404, "Employee not found");
  }

  const verification = await prisma.employeeVerification.findFirst({
    where: { employeeId: employee.id },
  });
  if (!verification) {
    return res.respond(404, "Verification record not found");
  }

  const verificationResponse = await verifyPAN(pan, name);

  if (verificationResponse.success) {
    await prisma.employeeVerification.update({
      where: { id: verification.id },
      data: { panNumber: pan },
    });

    return res.respond(200, "success!", {
      pan: verificationResponse.pan,
      type: verificationResponse.type,
      reference_id: verificationResponse.reference_id,
      name_provided: verificationResponse.name_provided,
      registered_name: verificationResponse.registered_name,
      message: verificationResponse.message,
    });
  } else {
    return res.respond(
      verificationResponse.status_code,
      "PAN verification failed!",
      verificationResponse.error
    );
  }
});

const checkEmployeePanStatus = asyncHandler(async (req, res) => {
  const user = req.user;
  const { referenceId } = req.body;
  if (!referenceId) {
    return res.respond(400, "Reference ID is required!");
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: user.id },
  });
  if (!employee) {
    return res.respond(404, "Employee not found");
  }

  const verification = await prisma.employeeVerification.findFirst({
    where: { employeeId: employee.id },
  });
  if (!verification) {
    return res.respond(404, "Verification record not found");
  }

  const statusResponse = await checkPanStatus(referenceId);

  if (statusResponse.success) {
    await prisma.employeeVerification.update({
      where: { id: verification.id },
      data: { isPanVerified: true },
    });

    return res.respond(200, "success!", statusResponse);
  } else {
    return res.respond(
      statusResponse.status_code,
      "PAN status check failed!",
      statusResponse.error
    );
  }
});

const faceLiveliness = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { verification_id } = req.body;

  const user = await prisma.customUser.findUnique({ where: { id: userId } });
  if (!user) return res.respond(404, "User not found");

  const selfieFile = req.files?.selfie?.[0];
  if (!selfieUrl) return res.respond(400, "Selfie is required");

  const selfieUrl = selfieFile
    ? `/uploads/employer/master_agreement/${selfieFile.filename}`
    : null;


  const employee = await prisma.employee.findFirst({
    where: { userId: user.id },
  });
  if (!employee) {
    return res.respond(404, "Employee not found");
  }

  const verification = await prisma.employeeVerification.findFirst({
    where: { employeeId: employee.id },
  });
  if (!verification) {
    return res.respond(404, "Verification record not found");
  }

  await prisma.employeeVerification.update({
    where: { id: verification.id },
    data: {
      selfie: selfieUrl,
    },
  });

  const finalVerificationId = verification_id || uuidv4();

  const responseData = await verifySelfie(selfieUrl, finalVerificationId);

  if (responseData.success) {
    await prisma.employeeVerification.update({
      where: { id: verification.id },
      data: { isSelfieVerified: true },
    });

    return res.respond(200, "Selfie verified successfully!", responseData);
  } else {
    return res.respond(
      responseData.status_code,
      "Face verification failed!",
      responseData.error
    );
  }
});

const cardController = asyncHandler(async (req, res) => {
  const today = new Date();
  const nextPayDate = new Date(today.setDate(today.getDate() + 4));

  res.respond(
    200,
    "Card Fetched successfully!",
    { totalAmount: 10000, withdrawlAmount: 7500, nextPayDate }
  );
});

// ##########----------Request Account Deactivation----------##########
const requestInactivation = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { reason } = req.body;

  const employee = await prisma.employee.findFirst({
    where: { userId },
  });
  if (!employee) {
    return res.respond(404, "Employee not found");
  }

  const existingRequest =
    await prisma.employeeAccountStatusRequest.findFirst({
      where: {
        employeeId: employee.id,
        requestType: "INACTIVATE",
        status: "PENDING",
      },
    });
  if (existingRequest) {
    return res.respond(400, "Inactivation request already pending");
  }

  await prisma.employeeAccountStatusRequest.create({
    data: {
      employeeId: employee.id,
      requestType: "INACTIVATE",
      reason: reason || null,
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return res.respond(200, "Your account will be deactivated after 7 days if you do not log in during this period");
});

// ##########----------Request Account Reactivation----------##########
const requestReactivation = asyncHandler(async (req, res) => {
  const { mobile, userType = "EMPLOYEE", reason } = req.body;

  if (!mobile) {
    return res.respond(400, "Mobile number is required");
  }

  const user = await prisma.customUser.findFirst({
    where: {
      userType,
      OR: [{ mobile }, { alternativeMobile: mobile }],
    },
  });
  if (!user) {
    return res.respond(404, "User not found");
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: user.id },
  });
  if (!employee) {
    return res.respond(404, "Employee not found");
  }

  if (employee.accountStatus !== "INACTIVE") {
    return res.respond(
      400,
      "Your account is already active or does not require reactivation"
    );
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      accountStatus: "ACTIVE",
    },
  });

  await prisma.employeeAccountStatusRequest.updateMany({
    where: {
      employeeId: employee.id,
      requestType: "ACTIVATE",
      status: "PENDING",
    },
    data: {
      status: "REJECTED",
      reviewRemark: "Auto-reactivated by user",
    },
  });

  await prisma.employeeAccountStatusRequest.create({
    data: {
      employeeId: employee.id,
      requestType: "ACTIVATE",
      status: "APPROVED",
      reason: reason || "User reactivated account",
      reviewRemark: "Auto-approved without admin",
    },
  });

  return res.respond(
    200,
    "Your account has been reactivated successfully. Please log in again."
  );
});

// ##########----------Get Employee Credit Report----------##########
const getCreditReport = asyncHandler(async (req, res) => {
  const userId = req.user;
  const { firstName, middleName, lastName, dob, pan, address, city, state, pincode, mobile } = req.body

  const employee = await prisma.employee.findFirst({
    where: { userId },
  });
  if (!employee) {
    return res.respond(404, "Employee not found!");
  }

  const existingReport = await prisma.crifReport.findFirst({
    where: {
      employeeId: employee.id,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingReport) {
    return res.respond(200, "CRIF report fetched from cache (within 30 days)", {
      cached: true,
      report: existingReport.responseBody,
    });
  }

  const applicantData = {
    inquiryDateTime: formatDateTime(),
    applicantId: employee.id,
    firstName: firstName || "",
    middleName: middleName || "",
    lastName: lastName || "",
    dob: dob,
    pan_number: pan || "",
    address: address || "",
    city: city || "",
    state: state || "",
    pincode: pincode || "",
    mobile: mobile,
    inquiryId: employee.id,
    applicationId: employee.id,
    loanAmount: "",
    ltv: "",
    term: "",
  };

  const crifResponse = await crifReportCustomer(applicantData);

  if (!crifResponse.success) {
    return res.respond(crifResponse.statusCode || 500, "Failed to fetch CRIF report", crifResponse.data);
  }

  await prisma.crifReport.upsert({
    where: { employeeId: employee.id },
    update: {
      responseBody: crifResponse.data,
      updatedAt: new Date(),
    },
    create: {
      employeeId: employee.id,
      responseBody: crifResponse.data,
    },
  });

  res.respond(200, "CRIF Report retrieved successfully!", {
    cached: false,
    report: crifResponse.data,
  });
});

module.exports = {
  sendUserOTP,
  verifyOTP,
  RegisterEmployee,
  updateEmployeeProfile,
  getEmployeeProfile,
  addEmployeeBank,
  getEmployeeBanks,
  verifyEmployeeEmployerLink,
  handleSendAadhaarOtp,
  handleVerifyAadhaarOtp,
  verifyEmployeePan,
  checkEmployeePanStatus,
  faceLiveliness,
  cardController,
  requestInactivation,
  requestReactivation,
  getCreditReport
};
