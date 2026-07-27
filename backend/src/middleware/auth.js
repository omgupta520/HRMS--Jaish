/**
 * Authentication middleware. Verifies the Bearer access token, loads the user,
 * and attaches a lightweight identity to req.user.
 */
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/tokens');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Authentication token missing');

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const user = await User.findById(payload.sub).populate('employee', 'firstName lastName employeeId');
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (!user.isActive) throw ApiError.forbidden('Account is inactive. Contact your administrator.');

  req.user = {
    id: user._id,
    name: user.name,
    role: user.role,
    company: user.company,
    employee: user.employee ? user.employee._id : null,
    employeeDoc: user.employee || null,
  };
  next();
});

module.exports = { authenticate };
