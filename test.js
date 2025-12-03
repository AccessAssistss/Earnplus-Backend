const axios = require("axios");

const getCrifReport = async () => {
  try {
    const requestBody = {
      "REQUEST-FILE": {
        "HEADER-SEGMENT": {
          "PRODUCT-TYPE": "CIR PRO V2",
          "PRODUCT-VER": "2.0",
          "USER-ID": "",
          "USER-PWD": "",
          "REQ-MBR": "",
          "REQ-VOL-TYPE": "C04",        // volume type required
          "REQ-ACTN-TYPE": "AT01",      // action type required
          "INQ-DT-TM": "23-09-2025 12:00", // current date-time
          "AUTH-FLG": "Y",
          "AUTH-TITLE": "USER",
          "RES-FRMT": "HTML",
          "LOS-NAME": "INHOUSE",
          "REQ-SERVICES-TYPE": "CIR"
        },
        "INQUIRY": {
          "APPLICANT-SEGMENT": {
            "APPLICANT-ID": "117872334422",
            "FIRST-NAME": "Sushil",
            "MIDDLE-NAME": "",
            "LAST-NAME": "Kumar",
            "DOB": {
              "DOB-DT": "28-03-2002"
            },
            // "RELATIONS": [
            //   { "TYPE": "K01", "VALUE": "" }
            // ],
            "IDS": [
              { "TYPE": "ID07", "VALUE": "" } // PAN
            ],
            "ADDRESSES": [
              {
                "TYPE": "D05",
                "ADDRESS-TEXT": "445, street number 22, prashant enclave, baprola",
                "CITY": "DELHI",
                "STATE": "DL",
                "PIN": "110043",
                "COUNTRY": "INDIA"
              }
            ],
            "PHONES": [
              { "TYPE": "P04", "VALUE": "" }
            ],
            "EMAILS": [
              { "EMAIL": "" }
            ]
          },
          "APPLICATION-SEGMENT": {
            "INQUIRY-UNIQUE-REF-NO": "7869",
            "CREDIT-RPT-ID": "",
            "CREDIT-RPT-TRN-DT-TM": "23-09-2025 12:00",
            "CREDIT-INQ-PURPS-TYPE": "CP06",
            "CREDIT-INQUIRY-STAGE": "COLLECTION",
            "CLIENT-CONTRIBUTOR-ID": "PRB0000003",
            "APPLICATION-ID": "8092017181742",
            "LOAN-AMT": "500000",
            "LTV": "12.3",
            "TERM": "234",
            "LOAN-TYPE": "A01"
          }
        }
      }
    };

    const response = await axios.post(
      "https://hub.crifhighmark.com/Inquiry/doGet.serviceJson/CIRProServiceSynchJson",
      requestBody,
      {
        headers: {
          "userId": "jaspreet_prd_cirpro@l2gfincap.in",
          "password": "A450AC81B3AC8DC04EDBC8C3FB40E3BE4EE44553",
          "CUSTOMER-ID": "NBF0005125",
          "PRODUCT-TYPE": "CIR PRO V2",
          "PRODUCT-VER": "2.0",
          "REQ-VOL-TYPE": "C04",
          "Content-Type": "application/json",
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching CRIF report:", error.response?.data || error.message);
    throw error;
  }
};

(async () => {
  try {
    const crifData = await getCrifReport();
    console.log("=== CRIF API Response ===");
    console.log(JSON.stringify(crifData, null, 2));
  } catch (err) {
    console.error("Test failed:", err.message);
  }
})();

module.exports = getCrifReport;
