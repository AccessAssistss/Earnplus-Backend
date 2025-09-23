const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createLogger } = require("../utils/logger");

const authLogger = createLogger("auth");

// ###############---------------Generate Random Password---------------###############
const generateRandomPassword = (length = 8) => {
  try {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    authLogger.info(
      `Random password generated successfully of length ${length}`
    );

    return password;
  } catch (error) {
    authLogger.error(`Error generating random password: ${error.message}`);

    throw error;
  }
};

// ###############---------------Hash Password Function---------------###############
const hashPassword = async (password) => {
  try {
    const hashed = await bcrypt.hash(password, 10);
    authLogger.info("Password hashed successfully");
    return hashed;
  } catch (error) {
    authLogger.error(`Error hashing password: ${error.message}`);
    throw error;
  }
};

// ###############---------------Verify Password Function---------------###############
const verifyPassword = async (password, hashedPassword) => {
  try {
    const isMatch = await bcrypt.compare(password, hashedPassword);
    authLogger.info("Password verification performed");
    return isMatch;
  } catch (error) {
    authLogger.error(`Error verifying password: ${error.message}`);
    throw error;
  }
};

// ###############---------------Generate Access Token Function---------------###############
const generateAccessToken = (user) => {
  try {
    const token = jwt.sign({ id: user.id }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    });
    authLogger.info(`Access token generated for user ID ${user.id}`);
    return token;
  } catch (error) {
    authLogger.error(`Error generating access token: ${error.message}`);
    throw error;
  }
};

// ###############---------------Generate Refresh Token Function---------------###############
const generateRefreshToken = (user) => {
  try {
    const token = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    });
    authLogger.info(`Refresh token generated for user ID ${user.id}`);
    return token;
  } catch (error) {
    authLogger.error(`Error generating refresh token: ${error.message}`);
    throw error;
  }
};

module.exports = {
  generateRandomPassword,
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
};
