const express = require("express");
const validateToken = require("../../../middleware/validateJwtToken");
const { createQuery, getQueries } = require("../../controllers/Employee/queryController");
const multerErrorHandler = require("../../../middleware/multerErrorHandler");
const createUploadMiddleware = require("../../../middleware/upload");
const { QUERY_FILE_FIELDS } = require("../../../utils/fileFieldMapper")

const router = express.Router();

const uploadEmployerFiles = createUploadMiddleware("employee", QUERY_FILE_FIELDS);

router.post("/createQuery", validateToken, uploadEmployerFiles, multerErrorHandler, createQuery)
router.get("/getQueries", getQueries)

module.exports = router