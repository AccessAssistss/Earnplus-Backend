const axios = require("axios");

const getCrifReport = async () => {
  try {
    const response = await axios.post(
      "https://test.crifhighmark.com/Inquiry/doGet.serviceJson/CIRProServiceSynchJson",
      {
        "REQUEST-FILE": {
          "HEADER-SEGMENT": {
            "PRODUCT-TYPE": "CIR PRO V2",
            "PRODUCT-VER": "2.0",
            "USER-ID": "jaspreet_uat_cirpro@l2gfincap.in",
            "USER-PWD": "0070617196139C9B94BBD6ED0028FE044B74AD70",
            "REQ-MBR": "NBF0003513",
            "INQ-DT-TM": "15-05-2018 11:1",
            "REQ-VOL-TYPE": "C04",
            "REQ-ACTN-TYPE": "AT01",
            "AUTH-FLG": "Y",
            "AUTH-TITLE": "USER",
            "RES-FRMT": "HTML",
            "MEMBER-PREF-OVERRIDE": "N",
            "RES-FRMT-EMBD": "N",
            "LOS-NAME": "INHOUSE",
            "LOS-VENDOR": "",
            "LOS-VERSION": "",
            "REQ-SERVICES-TYPE": "CIR",
          },
          "INQUIRY": {
            "APPLICANT-SEGMENT": {
              "APPLICANT-ID": "117872334422",
              "FIRST-NAME": "ALAM",
              "MIDDLE-NAME": "",
              "LAST-NAME": "SINGH",
              "DOB": {
                "DOB-DT": "15-06-1982",
                "AGE": "",
                "AGE-AS-ON": "",
              },
              "RELATIONS": [
                {
                  "TYPE": "K01",
                  "VALUE": "",
                },
              ],
              "IDS": [
                {
                  "TYPE": "ID07",
                  "VALUE": "KGIPE5241U",
                },
              ],
              "ADDRESSES": [
                {
                  "TYPE": "D05",
                  "ADDRESS-TEXT": "R 57 GREATER KAILASH I SOUTH ",
                  "CITY": "DELHI",
                  "STATE": "DL",
                  "LOCALITY": "",
                  "PIN": "110048",
                  "COUNTRY": "INDIA",
                },
              ],
              "PHONES": [
                {
                  "TYPE": "P04",
                  "VALUE": "6612484145",
                },
              ],
              "EMAILS": [{ "EMAIL": "" }],
              "ACCOUNT-NUMBER": "",
            },
            "APPLICATION-SEGMENT": {
              "INQUIRY-UNIQUE-REF-NO": "7869",
              "CREDIT-RPT-ID": "",
              "CREDIT-RPT-TRN-DT-TM": "12:00",
              "CREDIT-INQ-PURPS-TYPE": "CP06",
              "CREDIT-INQUIRY-STAGE": "COLLECTION",
              "CLIENT-CONTRIBUTOR-ID": "PRB0000003",
              "BRANCH-ID": "",
              "APPLICATION-ID": "8092017181742",
              "ACNT-OPEN-DT": "",
              "LOAN-AMT": "500000",
              "LTV": "12.3",
              "TERM": "234",
              "LOAN-TYPE": "A01",
              "LOAN-TYPE-DESC": "",
            },
          },
        },
      },
      {
        headers: {
          "userId": "jaspreet_uat_cirpro@l2gfincap.in",
          "password": "0070617196139C9B94BBD6ED0028FE044B74AD70",
          "CUSTOMER-ID": "NBF0003513",
          "PRODUCT-TYPE": "CIR PRO V2",
          "PRODUCT-VER": "2.0",
          "REQ-VOL-TYPE": "C04",
          "Content-Type": "application/json",
        },
      }
    );

    // Response from CRIF
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
