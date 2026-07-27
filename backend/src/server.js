/**
 * Server bootstrap: connect to MongoDB, start listening, and handle graceful
 * shutdown on fatal errors.
 */
const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

async function start() {
  await connectDB();
  const server = app.listen(env.port, () => {
    logger.info(`HRMS API running in ${env.nodeEnv} mode on http://localhost:${env.port}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled Rejection: ${reason}`);
  });
}

start();
