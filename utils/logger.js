const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { format } = require('date-fns');

const logDir = path.join(__dirname, '..', 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Function to create a logger
function createLogger(logType = 'earnplus') {
  const currentLogFileName = `${logType}.log`;
  const filePath = path.join(logDir, currentLogFileName);

  return winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.printf(({ timestamp, level, message }) => {
        const formattedTime = format(new Date(timestamp), 'yyyy-MM-dd HH:mm:ss');
        return `${formattedTime} [${level.toUpperCase()}]: ${message}`;
      })
    ),
    transports: [new winston.transports.File({ filename: filePath })],
  });
}

const logger = createLogger();

module.exports = {
  logger,
  createLogger,
};