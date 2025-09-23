const express = require("express");
const {
  createQueryCategory,
  updateQueryCategory,
  getAllQueryCategories,
  softDeleteQueryCategory,
  createQuerySubCategory,
  updateQuerySubCategory,
  getAllQuerySubCategories,
  softDeleteQuerySubCategory,
} = require("../../controllers/Associate/queryCategorySubCategoryController");

const router = express.Router();

// ###############---------------Category Routes---------------###############
router.post("/createQueryCategory", createQueryCategory);
router.put("/updateQueryCategory/:categoryId", updateQueryCategory);
router.get("/getAllQueryCategories", getAllQueryCategories);
router.patch("/softDeleteQueryCategory/:categoryId", softDeleteQueryCategory);

// ###############---------------Sub-Category Routes---------------###############
router.post("/createQuerySubCategory", createQuerySubCategory);
router.put("/updateQuerySubCategory/:subCategoryId", updateQuerySubCategory);
router.get("/getAllQuerySubCategories", getAllQuerySubCategories);
router.patch(
  "/softDeleteQuerySubCategory/:subCategoryId",
  softDeleteQuerySubCategory
);

module.exports = router;
