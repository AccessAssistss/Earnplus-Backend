const express = require("express");
const errorHandler = require("./utils/errorHandler");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const responseMiddleware = require("./utils/responseMiddleware");

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN
}));

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(responseMiddleware);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Welcome route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Earnplus Backend!",
  });
});

// Microservice Routes
// app.use("/jhatpat", require("./src/microservices/thirdParty/jhatpat/src/routes/routes"));

// API Routes
app.use("/api/v1", require("./src/routes/routes"));

// Error handling
app.use(errorHandler);

app
  .listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  })
  .on("error", (err) => {
    console.error("Server Error:", err);
    process.exit(1);
  });
