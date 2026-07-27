/**
 * Express application: security middleware, parsers, rate limiting, routes and
 * centralized error handling. Exported separately from server.js so it can be
 * imported in tests without binding a port.
 */
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const logger = require('./utils/logger');

const app = express();

// Security headers
app.use(helmet({ crossOriginResourcePolicy: false }));

// CORS — allow the configured client origin with credentials.
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

// Body parsing + compression
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// Request logging
app.use(morgan(env.isProd ? 'combined' : 'dev', { stream: { write: (msg) => logger.http?.(msg.trim()) || logger.info(msg.trim()) } }));

// Rate limiting — 300 requests / 15 min per IP for the API surface.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth endpoints to slow down brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});

app.use('/api/v1/auth', authLimiter);
app.use('/api/v1', apiLimiter, routes);

// Serve uploaded files statically (download routes still enforce auth where needed).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 404 + error handlers (must be last)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
