/**
 * Employee management. Creating an employee also provisions a login User and a
 * sequential employee ID, and seeds leave balances from the company's leave types.
 */
const crypto = require('crypto');
const mongoose = require('mongoose');

const Employee = require('../models/Employee');
const User = require('../models/User');
const Company = require('../models/Company');
const LeaveType = require('../models/LeaveType');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/ApiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { buildEmployeeId } = require('../utils/ids');
const { ROLES } = require('../config/roles');
const audit = require('../services/audit.service');
const { sendEmail, welcomeTemplate } = require('../services/email.service');
const env = require('../config/env');

const POPULATE = ['department', 'designation', 'branch', 'shift', 'reportingManager'];

/** Build the access filter for the current user (multi-tenancy + role scoping). */
function accessFilter(req) {
  const filter = {};
  if (req.user.role !== ROLES.SUPER_ADMIN) filter.company = req.user.company;
  else if (req.companyScope) filter.company = req.companyScope;

  // Managers only see their direct reports (plus themselves).
  if (req.user.role === ROLES.MANAGER) {
    filter.$or = [{ reportingManager: req.user.employee }, { _id: req.user.employee }];
  }
  // Employees only see themselves (enforced again per-route).
  if (req.user.role === ROLES.EMPLOYEE) filter._id = req.user.employee;
  return filter;
}

/** GET /employees */
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = accessFilter(req);

  if (req.query.search) {
    filter.$and = [
      {
        $or: [
          { firstName: { $regex: req.query.search, $options: 'i' } },
          { lastName: { $regex: req.query.search, $options: 'i' } },
          { email: { $regex: req.query.search, $options: 'i' } },
          { employeeId: { $regex: req.query.search, $options: 'i' } },
        ],
      },
    ];
  }
  if (req.query.department) filter.department = req.query.department;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.employmentType) filter.employmentType = req.query.employmentType;

  const [items, total] = await Promise.all([
    Employee.find(filter).populate(POPULATE).sort('-createdAt').skip(skip).limit(limit),
    Employee.countDocuments(filter),
  ]);

  return ok(res, { data: items, meta: buildMeta({ page, limit, total }) });
});

/** GET /employees/:id */
const getOne = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, ...accessFilter(req) };
  const employee = await Employee.findOne(filter).populate(POPULATE).populate('leaveBalances.leaveType');
  if (!employee) throw ApiError.notFound('Employee not found');
  return ok(res, { data: employee });
});

/** POST /employees */
const create = asyncHandler(async (req, res) => {
  const companyId = req.user.role === ROLES.SUPER_ADMIN ? req.body.company : req.user.company;
  if (!companyId) throw ApiError.badRequest('Company is required');

  const company = await Company.findById(companyId);
  if (!company) throw ApiError.notFound('Company not found');

  const { email, firstName, lastName, role = ROLES.EMPLOYEE } = req.body;
  if (await User.findOne({ email, company: companyId })) {
    throw ApiError.conflict('A user with this email already exists in the company');
  }

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      // Atomically reserve the next employee sequence number.
      const updatedCompany = await Company.findByIdAndUpdate(
        companyId,
        { $inc: { employeeSequence: 1 } },
        { new: true, session }
      );
      const employeeId = buildEmployeeId(updatedCompany.code, updatedCompany.employeeSequence);

      const tempPassword = crypto.randomBytes(5).toString('hex');
      const [user] = await User.create(
        [{ name: `${firstName} ${lastName || ''}`.trim(), email, password: tempPassword, role, company: companyId }],
        { session }
      );

      // Seed leave balances from active leave types.
      const leaveTypes = await LeaveType.find({ company: companyId, isActive: true }).session(session);
      const leaveBalances = leaveTypes.map((lt) => ({ leaveType: lt._id, balance: lt.annualQuota }));

      const [employee] = await Employee.create(
        [{ ...req.body, company: companyId, user: user._id, employeeId, leaveBalances }],
        { session }
      );

      user.employee = employee._id;
      await user.save({ session });

      result = { employee, user, tempPassword };
    });
    session.endSession();
  } catch (err) {
    session.endSession();
    throw err;
  }

  // Send welcome email with temporary credentials (logged in dev).
  const tpl = welcomeTemplate(result.employee.firstName, result.user.email, result.tempPassword, `${env.clientUrl}/login`);
  await sendEmail({ to: result.user.email, ...tpl });

  await audit.record(req, { action: 'employee.create', entity: 'Employee', entityId: result.employee._id });
  const populated = await Employee.findById(result.employee._id).populate(POPULATE);
  return created(res, { message: 'Employee created. Login credentials emailed.', data: populated });
});

/** PUT /employees/:id */
const update = asyncHandler(async (req, res) => {
  const companyFilter = req.user.role === ROLES.SUPER_ADMIN ? {} : { company: req.user.company };
  const payload = { ...req.body };
  delete payload.company;
  delete payload.user;
  delete payload.employeeId;

  const employee = await Employee.findOneAndUpdate(
    { _id: req.params.id, ...companyFilter },
    payload,
    { new: true, runValidators: true }
  ).populate(POPULATE);
  if (!employee) throw ApiError.notFound('Employee not found');

  // Keep the linked user's name/role in sync.
  if (req.body.firstName || req.body.lastName || req.body.role) {
    await User.updateOne(
      { _id: employee.user },
      {
        ...(req.body.role ? { role: req.body.role } : {}),
        name: `${employee.firstName} ${employee.lastName || ''}`.trim(),
      }
    );
  }

  await audit.record(req, { action: 'employee.update', entity: 'Employee', entityId: employee._id });
  return ok(res, { message: 'Employee updated', data: employee });
});

/** PATCH /employees/:id/status — change employment status + optionally deactivate login. */
const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const companyFilter = req.user.role === ROLES.SUPER_ADMIN ? {} : { company: req.user.company };
  const employee = await Employee.findOneAndUpdate(
    { _id: req.params.id, ...companyFilter },
    { status },
    { new: true }
  );
  if (!employee) throw ApiError.notFound('Employee not found');

  // Disable login for inactive employment statuses.
  const isActive = status === 'active' || status === 'on_notice';
  await User.updateOne({ _id: employee.user }, { isActive });

  await audit.record(req, { action: 'employee.status', entity: 'Employee', entityId: employee._id, meta: { status } });
  return ok(res, { message: `Employee marked ${status}`, data: employee });
});

/** DELETE /employees/:id — removes employee and its login. */
const remove = asyncHandler(async (req, res) => {
  const companyFilter = req.user.role === ROLES.SUPER_ADMIN ? {} : { company: req.user.company };
  const employee = await Employee.findOne({ _id: req.params.id, ...companyFilter });
  if (!employee) throw ApiError.notFound('Employee not found');
  await User.deleteOne({ _id: employee.user });
  await employee.deleteOne();
  await audit.record(req, { action: 'employee.delete', entity: 'Employee', entityId: employee._id });
  return ok(res, { message: 'Employee deleted' });
});

module.exports = { list, getOne, create, update, changeStatus, remove };
