/**
 * Read-only access to the audit trail (Super Admin: all; HR: own company).
 */
const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { ROLES } = require('../config/roles');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.user.role !== ROLES.SUPER_ADMIN) filter.company = req.user.company;
  if (req.query.action) filter.action = req.query.action;

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort('-createdAt').skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  return ok(res, { data: items, meta: buildMeta({ page, limit, total }) });
});

module.exports = { list };
