/**
 * Role-based access control helpers.
 *  - authorize(...roles): allow only the listed roles.
 *  - scopeToCompany: ensures non-super-admins can only touch their own company's
 *    data by forcing req.companyScope to their company id. Super admins may pass
 *    ?companyId to target a specific tenant.
 */
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/roles');

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

function scopeToCompany(req, res, next) {
  if (req.user.role === ROLES.SUPER_ADMIN) {
    // Super admin can optionally target a company; otherwise queries are global.
    req.companyScope = req.query.companyId || req.body.company || null;
  } else {
    if (!req.user.company) return next(ApiError.forbidden('No company associated with this account'));
    req.companyScope = String(req.user.company);
  }
  next();
}

module.exports = { authorize, scopeToCompany };
