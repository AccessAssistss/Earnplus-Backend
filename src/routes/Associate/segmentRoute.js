const express = require("express");
const { createProductSegment, updateProductSegment, getAllProductSegments, softDeleteProductSegment } = require("../../controllers/Associate/segmentController");

const router = express.Router();

router.post("/createProductSegment", createProductSegment);
router.put("/updateProductSegment/:segmentId", updateProductSegment);
router.get("/getAllProductSegments", getAllProductSegments);
router.delete("/softDeleteProductSegment/:segmentId", softDeleteProductSegment);

module.exports = router;
