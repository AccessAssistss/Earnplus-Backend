const express = require("express")
const { createFaq, getAllFaqs } = require("../../controllers/Employee/faqController")

const router = express.Router()

router.post("/createFaq", createFaq)
router.get("/getAllFaqs", getAllFaqs)

module.exports = router;