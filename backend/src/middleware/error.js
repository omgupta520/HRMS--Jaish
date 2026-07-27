/**
 * Centralized error handling: a 404 handler for unknown routes and a final
 * error middleware that normalizes everything into the standard JSON envelope.
 */
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let error = err;

  // Normalize common Mongoose errors into ApiError.
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  } else if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    error = ApiError.badRequest('Validation failed', details);
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ');
    error = ApiError.conflict(`Duplicate value for: ${field}`);
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(err.statusCode || 500, err.message || 'Internal server error');
  }

  if (error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${error.message}\n${err.stack}`);
  }

  const body = {
    success: false,
    message: error.message,
  };
  if (error.details) body.errors = error.details;
  if (!env.isProd && error.statusCode >= 500) body.stack = err.stack;

  res.status(error.statusCode || 500).json(body);
}

module.exports = { notFound, errorHandler };
