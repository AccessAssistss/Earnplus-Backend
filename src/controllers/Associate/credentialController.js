const { PrismaClient } = require("@prisma/client");
const { asyncHandler } = require("../../../utils/asyncHandler");

const prisma = new PrismaClient();

// ##########----------Forward CRIF Credentials----------##########
const CRIFCreditReport = asyncHandler(async (req, res) => {
  const body = req.body;

  const proxyKey = req.headers["x-api-key"];
  if (!proxyKey || proxyKey !== process.env.PROXY_KEY_JHATPAT) {
    return res.respond(401, "Unauthorized: Invalid proxy key");
  }

  try {
    const targetUrl = `https://hub.crifhighmark.com/Inquiry/doGet.serviceJson/CIRProServiceSynchJson`;

    const response = await axios.post(targetUrl, body, {
      headers: {
        "userId": process.env.API_USER,
        "password": process.env.API_PASS,
        "CUSTOMER-ID": process.env.API_CUSTOMER,
        "PRODUCT-TYPE": "CIR PRO V2",
        "PRODUCT-VER": "2.0",
        "REQ-VOL-TYPE": "C04",
        "Content-Type": "application/json",
      },
      validateStatus: () => true,
    });

    res.respond(
      response.status,
      "Request forwarded successfully!",
      response.data
    );
  } catch (error) {
    console.error("Proxy error:", error.message);

    res.respond(502, "Upstream service error", {
      error: error.response?.data || error.message,
    });
  }
});

module.exports = {
  GetCRIFCreditReport,
};
