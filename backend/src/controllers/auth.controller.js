/**
 * Authentication controller: company self-registration, login, token refresh,
 * logout, password reset and profile.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const User = require('../models/User');
const Company = require('../models/Company');
const Employee = require('../models/Employee');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/ApiResponse');
const { ROLES } = require('../config/roles');
const env = require('../config/env');
const { deriveCompanyCode, buildEmployeeId } = require('../utils/ids');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/tokens');
const audit = require('../services/audit.service');
const {
  sendEmail,
  passwordResetTemplate,
} = require('../services/email.service');

/** Issue an access+refresh pair and persist a hash of the refresh token. */
async function issueTokens(user) {
  const payload = { sub: String(user._id), role: user.role, company: user.company };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await User.updateOne({ _id: user._id }, { $push: { refreshTokens: hash } });
  return { accessToken, refreshToken };
}

function publicUser(user, company) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    company: company
      ? { id: company._id, name: company.name, code: company.code, currency: company.settings?.currency }
      : null,
    employee: user.employee || null,
  };
}

/**
 * POST /auth/register-company
 * Creates a Company + its first HR/Company-Admin user (with a backing Employee).
 */
const registerCompany = asyncHandler(async (req, res) => {
  const { companyName, adminName, email, password, phone } = req.body;

  const existing = await User.findOne({ email, company: { $ne: null } });
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      // Unique company code (append a number on collision).
      let code = deriveCompanyCode(companyName);
      let suffix = 0;
      // eslint-disable-next-line no-await-in-loop
      while (await Company.findOne({ code }).session(session)) {
        suffix += 1;
        code = `${deriveCompanyCode(companyName)}${suffix}`;
      }

      const [company] = await Company.create(
        [{ name: companyName, code, email, phone, employeeSequence: 1 }],
        { session }
      );

      const [user] = await User.create(
        [{ name: adminName, email, password, role: ROLES.HR, company: company._id }],
        { session }
      );

      const [employee] = await Employee.create(
        [
          {
            company: company._id,
            user: user._id,
            employeeId: buildEmployeeId(code, 1),
            firstName: adminName.split(' ')[0],
            lastName: adminName.split(' ').slice(1).join(' '),
            email,
            phone,
            joiningDate: new Date(),
          },
        ],
        { session }
      );

      user.employee = employee._id;
      await user.save({ session });

      result = { company, user };
    });
    session.endSession();

    const tokens = await issueTokens(result.user);
    await audit.record(req, { action: 'auth.register_company', entity: 'Company', entityId: result.company._id });

    return created(res, {
      message: 'Company registered successfully',
      data: { ...tokens, user: publicUser(result.user, result.company) },
    });
  } catch (err) {
    session.endSession();
    throw err;
  }
});

/** POST /auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password').populate('company');
  if (!user) throw ApiError.unauthorized('Invalid credentials');
  if (!user.isActive) throw ApiError.forbidden('Your account is inactive. Contact your administrator.');

  const match = await user.comparePassword(password);
  if (!match) throw ApiError.unauthorized('Invalid credentials');

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueTokens(user);
  await audit.record(req, { action: 'auth.login', entity: 'User', entityId: user._id });

  return ok(res, {
    message: 'Logged in successfully',
    data: { ...tokens, user: publicUser(user, user.company) },
  });
});

/** POST /auth/refresh — rotates the refresh token. */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.unauthorized('Refresh token required');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const user = await User.findById(payload.sub).select('+refreshTokens').populate('company');
  if (!user || !user.refreshTokens.includes(hash)) {
    throw ApiError.unauthorized('Refresh token is no longer valid');
  }

  // Rotate: remove the old hash, issue a fresh pair.
  user.refreshTokens = user.refreshTokens.filter((t) => t !== hash);
  await user.save();
  const tokens = await issueTokens(user);

  return ok(res, { message: 'Token refreshed', data: { ...tokens, user: publicUser(user, user.company) } });
});

/** POST /auth/logout — revokes the supplied refresh token. */
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await User.updateOne({ _id: req.user.id }, { $pull: { refreshTokens: hash } });
  }
  return ok(res, { message: 'Logged out' });
});

/** POST /auth/forgot-password */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  // Always return success to avoid leaking which emails exist.
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetUrl = `${env.clientUrl}/reset-password?token=${rawToken}`;
    const tpl = passwordResetTemplate(user.name, resetUrl);
    await sendEmail({ to: user.email, ...tpl });
  }
  return ok(res, { message: 'If that email exists, a reset link has been sent.' });
});

/** POST /auth/reset-password */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) throw ApiError.badRequest('Invalid or expired reset token');

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.refreshTokens = []; // force re-login everywhere
  await user.save();

  return ok(res, { message: 'Password reset successfully. Please log in.' });
});

/** GET /auth/me */
const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('company').populate('employee');
  return ok(res, { data: { user: publicUser(user, user.company), employee: user.employee } });
});

/** POST /auth/change-password */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+password');
  const match = await user.comparePassword(currentPassword);
  if (!match) throw ApiError.badRequest('Current password is incorrect');
  user.password = newPassword;
  await user.save();
  return ok(res, { message: 'Password updated' });
});

module.exports = {
  registerCompany,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
  changePassword,
};
