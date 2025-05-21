const express = require("express");
const errorHandler = require("./utils/errorHandler");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const responseMiddleware = require("./utils/responseMiddleware");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());


// Parse CORS_ORIGIN from env as comma-separated list, fallback to empty array
const corsOriginsRaw = process.env.CORS_ORIGIN || "";
const allowedOrigins = corsOriginsRaw.split(",").map(origin => origin.trim()).filter(Boolean);

const corsOptions = {
  origin: function(origin, callback) {
    // allow requests with no origin like mobile apps or curl requests
    if (!origin) return callback(null, true);

    if (allowedOrigins.length === 0) {
      // No allowed origins configured, block all cross-origin requests
      return callback(new Error("CORS policy: No allowed origins configured"), false);
    }

    if (allowedOrigins.includes(origin)) {
      // Origin is allowed
      return callback(null, true);
    } else {
      // Origin is not allowed
      return callback(new Error(`CORS policy: Origin ${origin} is not allowed`), false);
    }
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
};

app.use(cors(corsOptions));

// Preflight OPTIONS handler
app.options("*", (req, res) => {
  res.sendStatus(204);
});

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(responseMiddleware);

// Welcome route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the Earnplus Backend!",
  });
});

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
