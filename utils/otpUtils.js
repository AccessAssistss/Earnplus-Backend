const axios = require("axios");
const { default: axiosRetry } = require("axios-retry");
const otpGenerator = require("otp-generator");
const { createLogger } = require("../utils/logger");

const otpLogger = createLogger("otp");

// ###############---------------Generate OTP---------------###############
const generateOTP = async () => {
  try {
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
    });
    otpLogger.info("OTP generated successfully");
    return otp;
  } catch (error) {
    otpLogger.error(`Error generating OTP: ${error.message}`);
    throw error;
  }
};

// ###############---------------Retry failed requests up to 3 times using exponential backoff---------------###############
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    [408, 429, 500, 502, 503, 504].includes(error?.response?.status),
});

// ###############---------------Send OTP via SMS---------------###############
const sendOTP = async (mobile, otp) => {
  const url = "https://enterprise.smsgupshup.com/GatewayAPI/rest";

  const params = {
    method: "SendMessage",
    send_to: mobile,
    msg: `${otp} is OTP to Login on EarnPlus - L2G Fincap`,
    msg_type: "TEXT",
    userid: process.env.SMS_GATEWAY_USERID,
    auth_scheme: "plain",
    password: process.env.SMS_GATEWAY_PASSWORD,
    v: "1.1",
    format: "text",
  };

  try {
    otpLogger.info(`Sending OTP to ${mobile}`);
    const response = await axios.post(url, null, { params, timeout: 15000 });
    otpLogger.info("OTP sent successfully");
    otpLogger.debug(`SMS Gateway Response: ${response.data}`);
    return true;
  } catch (error) {
    console.log(error)
    if (error.response) {
      otpLogger.error(
        `HTTP Error: ${error.response.status}, ${error.response.data}`
      );
    } else if (error.code === "ECONNABORTED") {
      otpLogger.error("OTP request timed out");
    } else {
      otpLogger.error(`Unexpected error sending OTP: ${error.message}`);
    }
    return false;
  }
};

// ###############---------------Validate OTP time window (expired if more than 2 minutes old)---------------###############
const validateOTP = async (otpTime) => {
  try {
    const timeDiff = (new Date() - new Date(otpTime)) / (1000 * 60);
    const isExpired = timeDiff > 2;
    otpLogger.info(`OTP validation result: expired=${isExpired}`);
    return isExpired;
  } catch (error) {
    otpLogger.error(`Error validating OTP: ${error.message}`);
    return true;
  }
};

module.exports = {
  generateOTP,
  sendOTP,
  validateOTP,
};
