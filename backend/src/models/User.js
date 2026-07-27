const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLE_VALUES, ROLES } = require('../config/roles');

/**
 * Authentication identity. A User holds credentials + role. Employee-specific
 * HR data lives on the Employee document (linked via `employee`). Super admins
 * have no company; everyone else belongs to exactly one company.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLE_VALUES, default: ROLES.EMPLOYEE },
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },

    // Refresh token rotation: we store hashes of currently-valid refresh tokens.
    refreshTokens: { type: [String], select: false, default: [] },

    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// Email must be unique per company (and globally for super admins where company is null).
userSchema.index({ email: 1, company: 1 }, { unique: true });

// Hash password whenever it changes.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
