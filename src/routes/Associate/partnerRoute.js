const express = require("express");
const {
  createProductPartner,
  updateProductPartner,
  getAllProductPartners,
  softDeleteProductPartner,
} = require("../../controllers/Associate/partnerController");

const router = express.Router();

router.post("/createProductPartner", createProductPartner);
router.put("/updateProductPartner/:partnerId", updateProductPartner);
router.get("/getAllProductPartners", getAllProductPartners);
router.delete("/softDeleteProductPartner/:partnerId", softDeleteProductPartner);

module.exports = router;
