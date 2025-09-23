const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../../../../utils/asyncHandler");
const axios = require("axios")

const prisma = new PrismaClient();

// ##########----------Forward CRIF Credentials----------##########
const CRIFCreditReport = asyncHandler(async (req, res) => {
  const body = req.body;
  const proxyKey = req.headers["x-api-key"];
  const endpoint = req.originalUrl;

  let log = {
    partner: "Jhatpat",
    serviceName: "CRIF",
    endpoint,
    method: req.method,
    proxyKey,
    requestBody: body,
  };

  if (!proxyKey || proxyKey !== process.env.PROXY_KEY_JHATPAT) {
    log.error = "Unauthorized: Invalid proxy key";
    await prisma.proxyLog.create({ data: log });

    return res.respond(401, log.error);
  }

  try {
    body["REQUEST-FILE"]["HEADER-SEGMENT"]["USER-ID"] = process.env.CRIF_USERID;
    body["REQUEST-FILE"]["HEADER-SEGMENT"]["USER-PWD"] = process.env.CRIF_PASSWORD;
    body["REQUEST-FILE"]["HEADER-SEGMENT"]["REQ-MBR"] = process.env.CRIF_CUSTOMERID;

    const targetUrl = `https://hub.crifhighmark.com/Inquiry/doGet.serviceJson/CIRProServiceSynchJson`;

    const response = await axios.post(targetUrl, body, {
      headers: {
        "userId": process.env.CRIF_USERID,
        "password": process.env.CRIF_PASSWORD,
        "CUSTOMER-ID": process.env.CRIF_CUSTOMERID,
        "PRODUCT-TYPE": "CIR PRO V2",
        "PRODUCT-VER": "2.0",
        "REQ-VOL-TYPE": "C04",
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });

    log.responseStatus = response.status;
    log.responseBody = response.data;

    await prisma.proxyLog.create({ data: log });

    res.respond(
      response.status,
      "Request forwarded successfully!",
      response.data
    );
  } catch (error) {
    console.error("Proxy error:", error.message);
    log.error = error.message;
    log.responseStatus = 502;
    log.responseBody = error.response?.data || null;

    await prisma.proxyLog.create({ data: log });

    res.respond(502, "Upstream service error", {
      error: error.response?.data || error.message,
    });
  }
});

module.exports = {
  CRIFCreditReport,
};
