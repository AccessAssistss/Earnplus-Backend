const axios = require("axios");
const { createLogger } = require("../utils/logger");

const verificationLogger = createLogger("verification");

const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const BASE_URL = process.env.CASHFREE_BASE_URL;

// ##########----------Send OTP to Aadhaar-linked mobile using Cashfree----------##########
const sendAadhaarOtp = async (aadhaar_number) => {
  const url = `${BASE_URL}/verification/offline-aadhaar/otp`;

  const headers = {
    "x-client-id": CASHFREE_CLIENT_ID,
    "x-client-secret": CASHFREE_CLIENT_SECRET,
    "Content-Type": "application/json",
  };

  const payload = { aadhaar_number };

  try {
    verificationLogger.info("Initiating Aadhaar OTP send request", {
      url,
      payload,
    });

    const response = await axios.post(url, payload, { headers });
    const data = response.data;

    verificationLogger.info("Received response from Aadhaar OTP API", { data });

    if (response.status === 200 && data.status === "SUCCESS") {
      verificationLogger.info("OTP sent successfully", { refId: data.ref_id });

      return {
        success: true,
        status: data.status,
        message: data.message,
        refId: data.ref_id,
      };
    } else {
      verificationLogger.warn("Failed to send Aadhaar OTP", {
        status: response.status,
        message: data.message,
      });
      return {
        success: false,
        error: data.message || "Failed to send OTP",
        statusCode: response.status,
      };
    }
  } catch (error) {
    verificationLogger.error("Error while sending Aadhaar OTP", {
      error: error.message,
    });
    return {
      success: false,
      error: error.message,
      statusCode: 500,
    };
  }
};

// ##########----------Verify Aadhaar OTP with Cashfree----------##########
const verifyAadhaarOtp = async (otp, refId) => {
  const url = `${BASE_URL}/verification/offline-aadhaar/verify`;

  const headers = {
    "x-client-id": CASHFREE_CLIENT_ID,
    "x-client-secret": CASHFREE_CLIENT_SECRET,
    "Content-Type": "application/json",
  };

  const payload = {
    otp,
    ref_id: refId,
  };

  try {
    verificationLogger.info("Initiating Aadhaar OTP verification", {
      url,
      payload,
    });

    const response = await axios.post(url, payload, { headers });
    const data = response.data;

    verificationLogger.info("Received Aadhaar OTP verification response", {
      data,
    });

    if (response.status === 200 && data.status === "VALID") {
      verificationLogger.info("OTP verified successfully", { refId });

      return {
        success: true,
        refId: data.ref_id,
        status: data.status,
        message: data.message,
      };
    } else {
      verificationLogger.warn("OTP verification failed", {
        status: response.status,
        message: data.message,
      });

      return {
        success: false,
        error: data.message || "Aadhaar verification failed",
        statusCode: response.status,
      };
    }
  } catch (error) {
    verificationLogger.error("Error while verifying Aadhaar OTP", {
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
      statusCode: 500,
    };
  }
};

// ##########----------Verify PAN with Cashfree----------##########
const verifyPAN = async (pan, name) => {
  const url = `${BASE_URL}/verification/pan`;
  const headers = {
    "x-client-id": CASHFREE_CLIENT_ID,
    "x-client-secret": CASHFREE_CLIENT_SECRET,
    "Content-Type": "application/json",
  };

  const payload = {
    pan,
    name,
  };

  try {
    verificationLogger.info("Initiating PAN verification request", {
      url,
      payload,
    });

    const response = await axios.post(url, payload, { headers });
    const data = response.data;

    verificationLogger.info("Received PAN verification response", { data });

    if (response.status === 200 && data.valid) {
      verificationLogger.info("PAN verified successfully", {
        pan,
        reference_id: data.reference_id,
      });

      return {
        success: true,
        pan: data.pan,
        type: data.type,
        reference_id: data.reference_id,
        name_provided: data.name_provided,
        registered_name: data.registered_name,
        message: data.message,
        pan_status: data.pan_status,
      };
    } else {
      verificationLogger.warn("PAN verification failed", {
        status: response.status,
        message: data.message,
      });

      return {
        success: false,
        error: data.message || "PAN verification failed",
        status_code: response.status,
      };
    }
  } catch (error) {
    verificationLogger.error("Error during PAN verification", {
      error: error.message,
      response: error.response?.data,
    });

    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status_code: error.response?.status || 500,
    };
  }
};

// ##########----------Check PAN verification status----------##########
const checkPanStatus = async (referenceId) => {
  const url = `${BASE_URL}/verification/pan/${referenceId}`;
  const headers = {
    "x-client-id": CASHFREE_CLIENT_ID,
    "x-client-secret": CASHFREE_CLIENT_SECRET,
  };

  try {
    verificationLogger.info("Checking PAN verification status", {
      url,
      referenceId,
    });

    const response = await axios.get(url, { headers });
    const data = response.data;

    verificationLogger.info("Received PAN status response", { data });

    if (response.status === 200) {
      return {
        success: true,
        status: "success",
        message: data.message,
        valid: data.valid,
      };
    } else {
      verificationLogger.warn("PAN status check failed", {
        status: response.status,
        message: data.message,
      });

      return {
        success: false,
        error: data.message || "PAN status check failed",
        status_code: response.status,
      };
    }
  } catch (error) {
    verificationLogger.error("Error while checking PAN status", {
      error: error.message,
      response: error.response?.data,
    });

    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status_code: error.response?.status || 500,
    };
  }
};

// ##########----------Verify GST----------##########
const verifyGST = async (gstin, name = null) => {
  const url = `${BASE_URL}/verification/gstin`;

  const headers = {
    "x-client-id": CASHFREE_CLIENT_ID,
    "x-client-secret": CASHFREE_CLIENT_SECRET,
    "Content-Type": "application/json",
  };

  const payload = {
    GSTIN: gstin,
    ...(name && { business_name: name }),
  };

  try {
    verificationLogger.info("Initiating GST verification request", {
      url,
      payload,
    });

    const response = await axios.post(url, payload, { headers });
    const data = response.data;

    verificationLogger.info("Received response from GST API", { data });

    if (response.status === 200 && data.valid === true) {
      verificationLogger.info("GST verification successful", {
        gstin: data.GSTIN,
      });

      return {
        success: true,
        status: data.status,
        message: data.message,
        gstin: data.GSTIN,
        business_name: data.legal_name_of_business,
      };
    } else {
      verificationLogger.warn("GST verification failed", {
        status: response.status,
        message: data.message,
      });

      return {
        success: false,
        error: data.message || "GST verification failed",
        statusCode: response.status,
      };
    }
  } catch (error) {
    verificationLogger.error("Error during GST verification", {
      error: error.message,
    });
    return {
      success: false,
      error: error.message,
      statusCode: 500,
    };
  }
};

module.exports = {
  sendAadhaarOtp,
  verifyAadhaarOtp,
  verifyPAN,
  checkPanStatus,
  verifyGST,
};
