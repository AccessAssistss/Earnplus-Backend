const axios = require("axios");

const PROXY_CRIF_USER_ID = process.env.PROXY_CRIF_USER_ID;
const PROXY_CRIF_PASSWORD = process.env.PROXY_CRIF_PASSWORD;
const BASE_URL = process.env.CRIF_BASE_URL;

// ##########----------Pull Credit Report using CRIF----------##########
const crifReportCustomer = async (applicantData) => {
    try {
        const payload = {
            "REQUEST-FILE": {
                "HEADER-SEGMENT": {
                    "PRODUCT-TYPE": "CIR PRO V2",
                    "PRODUCT-VER": "2.0",
                    "REQ-VOL-TYPE": "C04",
                    "REQ-ACTN-TYPE": "AT01",
                    "INQ-DT-TM": applicantData.inquiryDateTime,
                    "AUTH-FLG": "Y",
                    "AUTH-TITLE": "USER",
                    "RES-FRMT": "HTML",
                    "RES-FRMT-EMBD": "Y",
                    "LOS-NAME": "INHOUSE",
                    "REQ-SERVICES-TYPE": "CIR"
                },
                "INQUIRY": {
                    "APPLICANT-SEGMENT": {
                        "APPLICANT-ID": applicantData.applicantId,
                        "FIRST-NAME": applicantData.firstName,
                        "MIDDLE-NAME": applicantData.middleName,
                        "LAST-NAME": applicantData.lastName,
                        "DOB": {
                            "DOB-DT": applicantData.dob
                        },
                        "IDS": [
                            {
                                "TYPE": "ID07",
                                "VALUE": applicantData.pan_number
                            }
                        ],
                        "ADDRESSES": [
                            {
                                "TYPE": "D05",
                                "ADDRESS-TEXT": applicantData.address,
                                "CITY": applicantData.city,
                                "STATE": applicantData.state,
                                "PIN": applicantData.pincode,
                                "COUNTRY": "INDIA"
                            }
                        ],
                        "PHONES": [
                            {
                                "TYPE": "P04",
                                "VALUE": applicantData.mobile
                            }
                        ]
                    },
                    "APPLICATION-SEGMENT": {
                        "INQUIRY-UNIQUE-REF-NO": applicantData.inquiryId,
                        "CREDIT-RPT-ID": "",
                        "CREDIT-RPT-TRN-DT-TM": "23-09-2025 12:00",
                        "CREDIT-INQ-PURPS-TYPE": "CP06",
                        "CREDIT-INQUIRY-STAGE": "COLLECTION",
                        "CLIENT-CONTRIBUTOR-ID": "PRB0000003",
                        "APPLICATION-ID": applicantData.applicationId,
                        "LOAN-AMT": applicantData.loanAmount,
                        "LTV": applicantData.ltv,
                        "TERM": applicantData.term,
                        "LOAN-TYPE": "A01"
                    }
                }
            }
        };

        const headers = {
            "userid": PROXY_CRIF_USER_ID,
            "password": PROXY_CRIF_PASSWORD,
            "Content-Type": "application/json",
        };

        const url = `${BASE_URL}/api/v1/proxy/earnplus/crif/CRIFCreditReport`;
        const response = await axios.post(url, payload, { headers, validateStatus: () => true });

        if (response.status === 200) {
            return { success: true, data: response.data };
        } else {
            return { success: false, data: response.data, statusCode: response.status };
        }
    } catch (error) {
        console.error("Error while fetching CRIF report:", error.message);
        return { success: false, error: error.message, statusCode: 500 };
    }
};

// ##########----------Pull Credit Report using CRIF----------##########
const crifReport = async (applicantData) => {
    try {
        const payload = {
            "REQUEST-FILE": {
                "HEADER-SEGMENT": {
                    "PRODUCT-TYPE": "CIR PRO V2",
                    "PRODUCT-VER": "2.0",
                    "REQ-VOL-TYPE": "C04",
                    "REQ-ACTN-TYPE": "AT01",
                    "INQ-DT-TM": applicantData.inquiryDateTime || "23-09-2025 12:00",
                    "AUTH-FLG": "Y",
                    "AUTH-TITLE": "USER",
                    "RES-FRMT": "HTML",
                    "RES-FRMT-EMBD": "Y",
                    "LOS-NAME": "INHOUSE",
                    "REQ-SERVICES-TYPE": "CIR"
                },
                "INQUIRY": {
                    "APPLICANT-SEGMENT": {
                        "APPLICANT-ID": applicantData.applicantId,
                        "FIRST-NAME": applicantData.firstName,
                        "MIDDLE-NAME": applicantData.middleName,
                        "LAST-NAME": applicantData.lastName,
                        "DOB": {
                            "DOB-DT": applicantData.dob
                        },
                        "IDS": [
                            {
                                "TYPE": "ID07",
                                "VALUE": applicantData.pan_number
                            }
                        ],
                        "ADDRESSES": [
                            {
                                "TYPE": "D05",
                                "ADDRESS-TEXT": applicantData.address,
                                "CITY": applicantData.city,
                                "STATE": applicantData.state,
                                "PIN": applicantData.pincode,
                                "COUNTRY": "INDIA"
                            }
                        ],
                        "PHONES": [
                            {
                                "TYPE": "P04",
                                "VALUE": applicantData.mobile
                            }
                        ]
                    },
                    "APPLICATION-SEGMENT": {
                        "INQUIRY-UNIQUE-REF-NO": applicantData.inquiryId,
                        "CREDIT-RPT-ID": "",
                        "CREDIT-RPT-TRN-DT-TM": "23-09-2025 12:00",
                        "CREDIT-INQ-PURPS-TYPE": "CP06",
                        "CREDIT-INQUIRY-STAGE": "COLLECTION",
                        "CLIENT-CONTRIBUTOR-ID": "PRB0000003",
                        "APPLICATION-ID": applicantData.applicationId,
                        "LOAN-AMT": applicantData.loanAmount,
                        "LTV": applicantData.ltv,
                        "TERM": applicantData.term,
                        "LOAN-TYPE": "A01"
                    }
                }
            }
        };

        const headers = {
            "userid": PROXY_CRIF_USER_ID,
            "password": PROXY_CRIF_PASSWORD,
            "Content-Type": "application/json",
        };

        const url = `${BASE_URL}/api/v1/proxy/earnplus/crif/CRIFCreditReport`;
        const response = await axios.post(url, payload, { headers, validateStatus: () => true });

        if (response.status === 200) {
            return { success: true, data: response.data };
        } else {
            return { success: false, data: response.data, statusCode: response.status };
        }
    } catch (error) {
        console.error("Error while fetching CRIF report:", error.message);
        return { success: false, error: error.message, statusCode: 500 };
    }
};

// ###############---------------Create VKYC Link---------------###############
const createVKYCLink = async (firstName, lastName, loanId, mobile, email, preferredAgentEmailId, isKyc = true, sendEmail = true, sendSms = true, randomAssignment = false, redirectionUrl = "") => {
    try {
        const url = `${BASE_URL}/api/v1/proxy/earnplus/digitap/CreateVKYCUrl`;

        const headers = {
            "userid": PROXY_CRIF_USER_ID,
            "password": PROXY_CRIF_PASSWORD,
            "Content-Type": "application/json",
        };

        const payload = {
            firstName: firstName,
            lastName: lastName,
            uniqueId: loanId,
            mobile: mobile,
            email: email,
            preferredAgentEmailId: preferredAgentEmailId || "",
            isKyc: isKyc,
            sendEmail: sendEmail,
            sendSms: sendSms,
            randomAssignment: randomAssignment,
            redirectionUrl: redirectionUrl
        };

        const response = await axios.post(url, payload, { headers, validateStatus: () => true });

        if (response.status === 200) {
            return { success: true, data: response.data };
        } else {
            return { success: false, data: response.data, statusCode: response.status };
        }
    } catch (error) {
        console.error("Error while creating VKYC Link:", error.message);
        return { success: false, error: error.message, statusCode: 500 };
    }
};

// ###############---------------Get VKYC Details By Session ID---------------###############
const GetVKYCDetailsBySessionId = async (sessionIds = []) => {
    try {
        const url = `${BASE_URL}/api/v1/proxy/earnplus/digitap/GetVKYCDetails`;

        const headers = {
            "userid": PROXY_CRIF_USER_ID,
            "password": PROXY_CRIF_PASSWORD,
            "Content-Type": "application/json",
        };

        const payload = {
            sessionIds: sessionIds,
        };

        const response = await axios.post(url, payload, { headers, validateStatus: () => true });

        if (response.status === 200) {
            return { success: true, data: response.data };
        } else {
            return { success: false, data: response.data, statusCode: response.status };
        }
    } catch (error) {
        console.error("Error while fetching VKYC Details:", error.message);
        return { success: false, error: error.message, statusCode: 500 };
    }
};

// ###############---------------Create VKYC Status By Unique ID---------------###############
const GetVKYCStatusByUniqueId = async (uniqueIds = []) => {
    try {
        const url = `${BASE_URL}/api/v1/proxy/earnplus/digitap/GetVKYCStatus`;

        const headers = {
            "userid": PROXY_CRIF_USER_ID,
            "password": PROXY_CRIF_PASSWORD,
            "Content-Type": "application/json",
        };

        const payload = {
            uniqueIds: uniqueIds,
        };

        const response = await axios.post(url, payload, { headers, validateStatus: () => true });

        if (response.status === 200) {
            return { success: true, data: response.data };
        } else {
            return { success: false, data: response.data, statusCode: response.status };
        }
    } catch (error) {
        console.error("Error while fetching VKYC Status:", error.message);
        return { success: false, error: error.message, statusCode: 500 };
    }
};

// ###############---------------Cams BSA Authentication--------------###############
const camsAuthentication = async () => {
    try {
        const url = `${BASE_URL}/api/v1/proxy/earnplus/cams/authentication`;

        const headers = {
            "userid": PROXY_CRIF_USER_ID,
            "password": PROXY_CRIF_PASSWORD,
            "Content-Type": "application/json",
        };

        const payload = {};

        const response = await axios.post(url, payload, { headers, validateStatus: () => true });

        if (response.status === 200) {
            return { success: true, data: response.data.data };
        } else {
            return { success: false, data: response.data, statusCode: response.status };
        }
    } catch (error) {
        console.error("Error while Authenticating Cams BSA:", error.message);
        return { success: false, error: error.message, statusCode: 500 };
    }
};

// ###############---------------Cams AA Redirection--------------###############
const camsAARedirection = async (clienttrnxid, phoneNumber, sessionId, token) => {
    try {
        const url = `${BASE_URL}/api/v1/proxy/earnplus/cams/aaRedirection`;

        const headers = {
            "userid": PROXY_CRIF_USER_ID,
            "password": PROXY_CRIF_PASSWORD,
            "Content-Type": "application/json",
        };

        const payload = {
            clienttrnxid,
            phoneNumber,
            sessionId,
            token,
        };

        const response = await axios.post(url, payload, { headers, validateStatus: () => true });

        if (response.status === 200) {
            return { success: true, data: response.data };
        } else {
            return { success: false, data: response.data, statusCode: response.status };
        }
    } catch (error) {
        console.error("Error while Creating Cams AA Redirection:", error.message);
        return { success: false, error: error.message, statusCode: 500 };
    }
};

// ###############---------------Cams Get Consent Data--------------###############
const camsGetConsentData = async (consentId, token) => {
    try {
        const url = `${BASE_URL}/api/v1/proxy/earnplus/cams/getConsentData`;

        const headers = {
            "userid": PROXY_CRIF_USER_ID,
            "password": PROXY_CRIF_PASSWORD,
            "Content-Type": "application/json",
        };

        const payload = {
            consentId,
            token,
        };


        const response = await axios.post(url, payload, { headers, validateStatus: () => true });

        if (response.status === 200) {
            return { success: true, data: response.data };
        } else {
            return { success: false, data: response.data, statusCode: response.status };
        }
    } catch (error) {
        console.error("Error while getting Cams consent data:", error.message);
        return { success: false, error: error.message, statusCode: 500 };
    }
};

// ###############---------------Cams Fetch Periodic Data--------------###############
const camsFetchPeriodicData = async (sessionId, txnId, consentId, token) => {
    try {
        const url = `${BASE_URL}/api/v1/proxy/earnplus/cams/fetchPeriodicData`;

        const headers = {
            "userid": PROXY_CRIF_USER_ID,
            "password": PROXY_CRIF_PASSWORD,
            "Content-Type": "application/json",
        };

        const payload = {
            sessionId,
            txnId,
            consentId,
            token,
        };

        const response = await axios.post(url, payload, { headers, validateStatus: () => true });

        if (response.status === 200) {
            return { success: true, data: response.data };
        } else {
            return { success: false, data: response.data, statusCode: response.status };
        }
    } catch (error) {
        console.error("Error while Fetching Cams Periodic Data:", error.message);
        return { success: false, error: error.message, statusCode: 500 };
    }
};

module.exports = {
    crifReportCustomer,
    crifReport,
    createVKYCLink,
    GetVKYCDetailsBySessionId,
    GetVKYCStatusByUniqueId,
    camsAuthentication,
    camsAARedirection,
    camsGetConsentData,
    camsFetchPeriodicData,
}