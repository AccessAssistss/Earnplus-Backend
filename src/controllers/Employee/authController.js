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
} = require("../../../utils/verificationUtils");

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
const STATIC_OTP = "612743";
const TEST_MOBILE = "1239956739";
// ##########----------Send OTP To Employee----------##########
const sendUserOTP = asyncHandler(async (req, res) => {
  const { userType = "EMPLOYEE", mobile } = req.body;

  if (!mobile) {
    return res.respond(400, "Mobile is required!");
  }

  const otp = mobile === TEST_MOBILE ? STATIC_OTP : await generateOTP();

  const user = await prisma.customUser.findFirst({
    where: {
      userType,
      OR: [{ mobile }, { alternativeMobile: mobile }],
    },
  });

  const employee = user
    ? await prisma.employee.findFirst({
      where: {
        userId: user.id,
        OR: [{ mobile }, { alternativeMobile: mobile }],
      },
    })
    : null;

  const isExistingUser = !!employee;

  const sent = await sendOTP(mobile, otp);
  if (!sent) {
    return res.respond(500, "Failed to send OTP");
  }

  if (employee) {
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        otp,
        otpExpiration: new Date(),
      },
    });
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
    const isExistingEmployee = !!employee;

    const { accessToken, refreshToken } = generateAccessAndRefreshTokens(
      user.id
    );

    return res.respond(200, `Test user OTP verified successfully!`, {
      otp,
      isExistingEmployee,
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
    return res.respond(400, "User not found!");
  }

  const employee = await prisma.employee.findFirst({
    where: { userId: user.id },
  });
  if (!employee) {
    return res.respond(404, "Employee not found!");
  }

  if (employee.otp !== otp) {
    return res.respond(400, "Invalid OTP!");
  }

  const isOtpExpired = await validateOTP(employee.otpExpiration);
  if (isOtpExpired) {
    return res.respond(404, "OTP has Expired!");
  }

  const isExistingUser = !!employee;

  const screenCheck = employee?.isEmployerScreen;
  const isEmployerPart = !!employee?.employerId;

  const verification = await prisma.employeeVerification.findFirst({
    where: { employeeId: employee?.id || "" },
  });

  const adharCheck = verification?.isAadharVerified || false;
  const panCheck = verification?.isPanVerified || false;
  const videoCheck = employee?.isKycVerified || false;
  const selfieCheck = verification?.isSelfieVerified || false;

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user.id
  );

  res.respond(200, `OTP verified successfully!`, {
    isExistingUser,
    isEmployerScreen: screenCheck,
    isEmployerPart,
    adharCheck,
    panCheck,
    videoCheck,
    selfieCheck,
    accessToken,
    refreshToken,
  });
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
  const { aadhaarNumber } = req.body;
  const user = req.user;

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
  const { refId, otp } = req.body;
  const user = req.user;

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

module.exports = {
  sendUserOTP,
  verifyOTP,
  verifyEmployeeEmployerLink,
  handleSendAadhaarOtp,
  handleVerifyAadhaarOtp,
  verifyEmployeePan,
  checkEmployeePanStatus,
};
