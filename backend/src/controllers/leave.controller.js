/**
 * Leave management with a two-step approval flow:
 *   employee applies -> manager approves -> HR gives final approval.
 * Leave balance is deducted only once, at final HR approval, and restored on
 * cancellation of an approved leave.
 */
const dayjs = require('dayjs');

const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const LeaveType = require('../models/LeaveType');
const Company = require('../models/Company');
const Holiday = require('../models/Holiday');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/ApiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { countWorkingDays } = require('../services/date.service');
const { ROLES } = require('../config/roles');
const audit = require('../services/audit.service');

/** POST /leaves — employee applies for leave. */
const apply = asyncHandler(async (req, res) => {
  const employeeId = req.user.employee || req.body.employee;
  const employee = await Employee.findById(employeeId);
  if (!employee) throw ApiError.notFound('Employee profile not found');

  const { leaveType, startDate, endDate, reason } = req.body;
  if (dayjs(endDate).isBefore(dayjs(startDate))) {
    throw ApiError.badRequest('End date cannot be before start date');
  }

  const type = await LeaveType.findOne({ _id: leaveType, company: employee.company });
  if (!type) throw ApiError.notFound('Leave type not found');

  const company = await Company.findById(employee.company);
  const holidays = await Holiday.find({
    company: employee.company,
    date: { $gte: dayjs(startDate).startOf('day').toDate(), $lte: dayjs(endDate).endOf('day').toDate() },
  }).select('date');

  const days = countWorkingDays(
    startDate,
    endDate,
    company.settings?.workingDays,
    holidays.map((h) => h.date)
  );
  if (days <= 0) throw ApiError.badRequest('Selected range contains no working days');

  // Validate available balance for paid leave types.
  if (type.isPaid) {
    const bal = employee.leaveBalances.find((b) => String(b.leaveType) === String(type._id));
    const available = bal ? bal.balance : 0;
    if (days > available) {
      throw ApiError.badRequest(`Insufficient ${type.name} balance. Available: ${available}, requested: ${days}`);
    }
  }

  const leave = await Leave.create({
    company: employee.company,
    employee: employee._id,
    leaveType: type._id,
    startDate,
    endDate,
    days,
    reason,
    isPaid: type.isPaid,
    status: 'pending',
  });

  await audit.record(req, { action: 'leave.apply', entity: 'Leave', entityId: leave._id });
  return created(res, { message: 'Leave applied', data: leave });
});

/** GET /leaves — role-scoped listing with filters. */
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.user.role !== ROLES.SUPER_ADMIN) filter.company = req.user.company;
  else if (req.companyScope) filter.company = req.companyScope;

  if (req.user.role === ROLES.EMPLOYEE) {
    filter.employee = req.user.employee;
  } else if (req.user.role === ROLES.MANAGER) {
    // Manager sees their team's requests.
    const team = await Employee.find({ reportingManager: req.user.employee }).select('_id');
    filter.employee = { $in: team.map((e) => e._id) };
  } else if (req.query.employee) {
    filter.employee = req.query.employee;
  }

  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    Leave.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .populate('leaveType', 'name color isPaid')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit),
    Leave.countDocuments(filter),
  ]);
  return ok(res, { data: items, meta: buildMeta({ page, limit, total }) });
});

/** PATCH /leaves/:id/manager — manager approves/rejects. */
const managerAction = asyncHandler(async (req, res) => {
  const { decision, comment } = req.body; // approved | rejected
  const leave = await Leave.findById(req.params.id);
  if (!leave) throw ApiError.notFound('Leave not found');
  if (leave.status !== 'pending') throw ApiError.badRequest(`Leave is already ${leave.status}`);

  leave.managerAction = { by: req.user.id, at: new Date(), comment };
  leave.status = decision === 'approved' ? 'manager_approved' : 'rejected';
  await leave.save();
  await audit.record(req, { action: 'leave.manager_action', entity: 'Leave', entityId: leave._id, meta: { decision } });
  return ok(res, { message: `Leave ${leave.status}`, data: leave });
});

/** PATCH /leaves/:id/hr — HR final approval; deducts balance on approval. */
const hrAction = asyncHandler(async (req, res) => {
  const { decision, comment } = req.body;
  const leave = await Leave.findById(req.params.id);
  if (!leave) throw ApiError.notFound('Leave not found');
  if (!['pending', 'manager_approved'].includes(leave.status)) {
    throw ApiError.badRequest(`Leave is already ${leave.status}`);
  }

  leave.hrAction = { by: req.user.id, at: new Date(), comment };

  if (decision === 'approved') {
    leave.status = 'approved';
    // Deduct balance once for paid leaves.
    if (leave.isPaid && !leave.balanceDeducted) {
      const employee = await Employee.findById(leave.employee);
      const bal = employee.leaveBalances.find((b) => String(b.leaveType) === String(leave.leaveType));
      if (bal) {
        bal.balance = Math.max(bal.balance - leave.days, 0);
        await employee.save();
      }
      leave.balanceDeducted = true;
    }
  } else {
    leave.status = 'rejected';
  }
  await leave.save();
  await audit.record(req, { action: 'leave.hr_action', entity: 'Leave', entityId: leave._id, meta: { decision } });
  return ok(res, { message: `Leave ${leave.status}`, data: leave });
});

/** PATCH /leaves/:id/cancel — cancel; restores balance if it was deducted. */
const cancel = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) throw ApiError.notFound('Leave not found');

  const isOwner = String(leave.employee) === String(req.user.employee);
  if (req.user.role === ROLES.EMPLOYEE && !isOwner) throw ApiError.forbidden();
  if (['rejected', 'cancelled'].includes(leave.status)) throw ApiError.badRequest('Leave already closed');

  if (leave.balanceDeducted) {
    const employee = await Employee.findById(leave.employee);
    const bal = employee.leaveBalances.find((b) => String(b.leaveType) === String(leave.leaveType));
    if (bal) {
      bal.balance += leave.days;
      await employee.save();
    }
    leave.balanceDeducted = false;
  }
  leave.status = 'cancelled';
  await leave.save();
  await audit.record(req, { action: 'leave.cancel', entity: 'Leave', entityId: leave._id });
  return ok(res, { message: 'Leave cancelled', data: leave });
});

/** GET /leaves/balance — current employee's leave balances. */
const balance = asyncHandler(async (req, res) => {
  const employeeId = req.query.employee || req.user.employee;
  const employee = await Employee.findById(employeeId).populate('leaveBalances.leaveType', 'name color isPaid annualQuota');
  if (!employee) throw ApiError.notFound('Employee not found');
  return ok(res, { data: employee.leaveBalances });
});

/** GET /leaves/calendar — approved/pending leaves in a date range for calendar view. */
const calendar = asyncHandler(async (req, res) => {
  const filter = { status: { $in: ['approved', 'manager_approved', 'pending'] } };
  if (req.user.role !== ROLES.SUPER_ADMIN) filter.company = req.user.company;
  if (req.query.from || req.query.to) {
    filter.startDate = {};
    if (req.query.to) filter.startDate.$lte = dayjs(req.query.to).endOf('day').toDate();
    filter.endDate = {};
    if (req.query.from) filter.endDate.$gte = dayjs(req.query.from).startOf('day').toDate();
  }
  const leaves = await Leave.find(filter)
    .populate('employee', 'firstName lastName employeeId')
    .populate('leaveType', 'name color');
  return ok(res, { data: leaves });
});

module.exports = { apply, list, managerAction, hrAction, cancel, balance, calendar };
