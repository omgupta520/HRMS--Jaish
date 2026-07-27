/**
 * Company management. Super Admin manages all tenants; HR manages their own
 * company profile and settings.
 */
const Company = require('../models/Company');
const User = require('../models/User');
const Employee = require('../models/Employee');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/ApiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { ROLES } = require('../config/roles');
const audit = require('../services/audit.service');

/** GET /companies (Super Admin) */
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const [items, total] = await Promise.all([
    Company.find(filter).sort('-createdAt').skip(skip).limit(limit).lean(),
    Company.countDocuments(filter),
  ]);

  // Attach employee counts for the admin list view.
  const withCounts = await Promise.all(
    items.map(async (c) => ({
      ...c,
      employeeCount: await Employee.countDocuments({ company: c._id }),
    }))
  );
  return ok(res, { data: withCounts, meta: buildMeta({ page, limit, total }) });
});

/** GET /companies/me — current user's company profile. */
const getMine = asyncHandler(async (req, res) => {
  if (!req.user.company) throw ApiError.badRequest('No company associated with this account');
  const company = await Company.findById(req.user.company);
  return ok(res, { data: company });
});

/** GET /companies/:id (Super Admin) */
const getOne = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) throw ApiError.notFound('Company not found');
  return ok(res, { data: company });
});

/** PUT /companies/:id — update profile/settings (HR for own company, SA for any). */
const update = asyncHandler(async (req, res) => {
  const targetId = req.params.id === 'me' ? req.user.company : req.params.id;
  if (req.user.role !== ROLES.SUPER_ADMIN && String(targetId) !== String(req.user.company)) {
    throw ApiError.forbidden('You can only update your own company');
  }
  const payload = { ...req.body };
  delete payload.code; // immutable
  delete payload.employeeSequence;

  const company = await Company.findByIdAndUpdate(targetId, payload, { new: true, runValidators: true });
  if (!company) throw ApiError.notFound('Company not found');
  await audit.record(req, { action: 'company.update', entity: 'Company', entityId: company._id });
  return ok(res, { message: 'Company updated', data: company });
});

/** PATCH /companies/:id/active (Super Admin) — activate/suspend a tenant. */
const toggleActive = asyncHandler(async (req, res) => {
  const company = await Company.findByIdAndUpdate(
    req.params.id,
    { isActive: !!req.body.isActive },
    { new: true }
  );
  if (!company) throw ApiError.notFound('Company not found');
  // Suspending a company disables all its logins.
  await User.updateMany({ company: company._id }, { isActive: company.isActive });
  await audit.record(req, { action: 'company.toggle_active', entity: 'Company', entityId: company._id, meta: { isActive: company.isActive } });
  return ok(res, { message: `Company ${company.isActive ? 'activated' : 'suspended'}`, data: company });
});

module.exports = { list, getMine, getOne, update, toggleActive };
