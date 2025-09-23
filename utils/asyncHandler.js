const { createLogger } = require("../utils/logger");

const logger = createLogger("errorHandler");

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    logger.error("Error occurred in request", {
      method: req.method,
      url: req.originalUrl,
      error: error.message,
      stack: error.stack,
    });
    next(error);
  }
};

module.exports = { asyncHandler };
