const express = require("express");
const { createFieldCategory, updateFieldCategory, getAllFieldCategories, softDeleteFieldCategory } = require("../../controllers/Associate/fieldCategoryController");

const router = express.Router();

router.post("/createFieldCategory", createFieldCategory);
router.put("/updateFieldCategory/:categoryId", updateFieldCategory);
router.get("/getAllFieldCategories", getAllFieldCategories);
router.delete("/softDeleteFieldCategory/:categoryId", softDeleteFieldCategory);

module.exports = router;
