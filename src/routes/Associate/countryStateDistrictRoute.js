const express = require("express");
const {
  createCountry,
  updateCountry,
  softDeleteCountry,
  getAllCountries,
  createState,
  updateState,
  getStatesByCountry,
  softDeleteState,
  createDistrict,
  updateDistrict,
  getDistrictsByState,
  softDeleteDistrict,
} = require("../../controllers/Associate/countryStateDistrictController");

const router = express.Router();

// ###############---------------Country Routes---------------###############
router.post("/createCountry", createCountry);
router.put("/updateCountry/:countryId", updateCountry);
router.get("/getAllCountries", getAllCountries);
router.patch("/softDeleteCountry/:countryId", softDeleteCountry);

// ###############---------------State Routes---------------###############
router.post("/createState", createState);
router.put("/updateState/:stateId", updateState);
router.get("/getStatesByCountry/:countryId", getStatesByCountry);
router.patch("/softDeleteState/:stateId", softDeleteState);

// ###############---------------District Routes---------------###############
router.post("/createDistrict", createDistrict);
router.put("/updateDistrict/:districtId", updateDistrict);
router.get("/getDistrictsByState/:stateId", getDistrictsByState);
router.patch("/softDeleteDistrict/:districtId", softDeleteDistrict);

module.exports = router;
