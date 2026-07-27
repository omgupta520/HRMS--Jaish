/**
 * Multer configuration for employee document uploads. Files are stored on disk
 * under /uploads/<companyId>/ with a randomized filename to avoid collisions.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

const ALLOWED = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx'];

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const companyId = String(req.user?.company || req.companyScope || 'common');
    const dir = path.join(UPLOAD_ROOT, companyId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(8).toString('hex');
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED.includes(ext)) {
    return cb(ApiError.badRequest(`Unsupported file type. Allowed: ${ALLOWED.join(', ')}`));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 },
});

module.exports = { upload, UPLOAD_ROOT };
