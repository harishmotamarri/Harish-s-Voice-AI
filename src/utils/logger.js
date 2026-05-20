/**
 * src/utils/logger.js
 * Winston logger — writes to console + rotating file.
 */
const { createLogger, format, transports } = require('winston');
const path = require('path');

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const extras = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} [${level}] ${message}${extras}`;
        })
      )
    })
  ]
});

// Conditionally add File transport if not in Vercel/Production
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new transports.File({
      filename: path.join(__dirname, '../../logs/app.log'),
      maxsize:  5 * 1024 * 1024, // 5 MB
      maxFiles: 3,
      tailable: true
    })
  );
}

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

module.exports = logger;
