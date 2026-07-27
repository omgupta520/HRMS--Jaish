/**
 * Attendance management: self check-in/out, manual marking by HR, regularization
 * workflow and monthly reports. One record per employee per day is enforced by a
 * unique index; we use upserts keyed on the normalized date.
 */
const dayjs = require('dayjs');

const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Company = require('../models/Company');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/ApiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { startOfDay } = require('../services/date.service');
const { ROLES } = require('../config/roles');
const audit = require('../services/audit.service');

/** Resolve the Employee id the current request acts on (self unless HR/Manager). */
async function resolveEmployee(req) {
  if (req.body.employee || req.query.employee) {
    const id = req.body.employee || req.query.employee;
    const emp = await Employee.findById(id);
    if (!emp) throw ApiError.notFound('Employee not found');
    return emp;
  }
  if (!req.user.employee) throw ApiError.badRequest('No employee profile linked to this account');
  return Employee.findById(req.user.employee);
}

/** Determine if a check-in time is "late" based on company config. */
function isLateCheckIn(company, when) {
  const [h, m] = (company.settings?.lateMarkAfter || '09:30').split(':').map(Number);
  const threshold = dayjs(when).hour(h).minute(m).second(0);
  return dayjs(when).isAfter(threshold);
}

/** POST /attendance/check-in */
const checkIn = asyncHandler(async (req, res) => {
  const employee = await resolveEmployee(req);
  const company = await Company.findById(employee.company);
  const today = startOfDay(new Date());

  let record = await Attendance.findOne({ employee: employee._id, date: today });
  if (record && record.checkIn) throw ApiError.conflict('Already checked in today');

  const now = new Date();
  const data = {
    company: employee.company,
    employee: employee._id,
    date: today,
    checkIn: now,
    status: 'present',
    isLate: isLateCheckIn(company, now),
    shift: employee.shift,
    geo: req.body.geo,
  };

  record = await Attendance.findOneAndUpdate(
    { employee: employee._id, date: today },
    { $set: data },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await audit.record(req, { action: 'attendance.check_in', entity: 'Attendance', entityId: record._id });
  return ok(res, { message: 'Checked in', data: record });
});

/** POST /attendance/check-out */
const checkOut = asyncHandler(async (req, res) => {
  const employee = await resolveEmployee(req);
  const company = await Company.findById(employee.company);
  const today = startOfDay(new Date());

  const record = await Attendance.findOne({ employee: employee._id, date: today });
  if (!record || !record.checkIn) throw ApiError.badRequest('No check-in found for today');
  if (record.checkOut) throw ApiError.conflict('Already checked out today');

  const now = new Date();
  const hours = dayjs(now).diff(dayjs(record.checkIn), 'minute') / 60;
  record.checkOut = now;
  record.workedHours = Math.round(hours * 100) / 100;
  record.status = hours < (company.settings?.halfDayHours || 4) ? 'half_day' : 'present';
  await record.save();

  await audit.record(req, { action: 'attendance.check_out', entity: 'Attendance', entityId: record._id });
  return ok(res, { message: 'Checked out', data: record });
});

/** POST /attendance/mark — HR manually marks/updates a day's attendance. */
const mark = asyncHandler(async (req, res) => {
  const { employee: employeeId, date, status, checkIn, checkOut, note } = req.body;
  const employee = await Employee.findById(employeeId);
  if (!employee) throw ApiError.notFound('Employee not found');
  if (req.user.role !== ROLES.SUPER_ADMIN && String(employee.company) !== String(req.user.company)) {
    throw ApiError.forbidden('Cannot mark attendance for another company');
  }

  const day = startOfDay(date || new Date());
  const record = await Attendance.findOneAndUpdate(
    { employee: employee._id, date: day },
    {
      $set: {
        company: employee.company,
        status,
        checkIn: checkIn || undefined,
        checkOut: checkOut || undefined,
        note,
        markedBy: req.user.id,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await audit.record(req, { action: 'attendance.mark', entity: 'Attendance', entityId: record._id, meta: { status } });
  return ok(res, { message: 'Attendance marked', data: record });
});

/** GET /attendance — list with filters (employee, date range, status). */
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.user.role !== ROLES.SUPER_ADMIN) filter.company = req.user.company;
  else if (req.companyScope) filter.company = req.companyScope;

  if (req.user.role === ROLES.EMPLOYEE) filter.employee = req.user.employee;
  else if (req.query.employee) filter.employee = req.query.employee;

  if (req.query.status) filter.status = req.query.status;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = startOfDay(req.query.from);
    if (req.query.to) filter.date.$lte = startOfDay(req.query.to);
  }

  const [items, total] = await Promise.all([
    Attendance.find(filter).populate('employee', 'firstName lastName employeeId').sort('-date').skip(skip).limit(limit),
    Attendance.countDocuments(filter),
  ]);
  return ok(res, { data: items, meta: buildMeta({ page, limit, total }) });
});

/** GET /attendance/monthly?employee=&month=&year= — monthly summary for an employee. */
const monthly = asyncHandler(async (req, res) => {
  const employeeId = req.query.employee || req.user.employee;
  if (!employeeId) throw ApiError.badRequest('Employee is required');

  const month = parseInt(req.query.month, 10) || dayjs().month() + 1;
  const year = parseInt(req.query.year, 10) || dayjs().year();
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month').toDate();
  const end = dayjs(start).endOf('month').toDate();

  const records = await Attendance.find({ employee: employeeId, date: { $gte: start, $lte: end } }).sort('date');

  const summary = { present: 0, absent: 0, half_day: 0, on_leave: 0, wfh: 0, late: 0, total: records.length };
  records.forEach((r) => {
    if (summary[r.status] !== undefined) summary[r.status] += 1;
    if (r.isLate) summary.late += 1;
  });

  return ok(res, { data: { month, year, summary, records } });
});

/** POST /attendance/:id/regularize — employee requests a correction. */
const requestRegularization = asyncHandler(async (req, res) => {
  const record = await Attendance.findById(req.params.id);
  if (!record) throw ApiError.notFound('Attendance record not found');
  if (req.user.role === ROLES.EMPLOYEE && String(record.employee) !== String(req.user.employee)) {
    throw ApiError.forbidden('You can only regularize your own attendance');
  }
  record.regularization = { requested: true, reason: req.body.reason, status: 'pending' };
  await record.save();
  await audit.record(req, { action: 'attendance.regularize_request', entity: 'Attendance', entityId: record._id });
  return ok(res, { message: 'Regularization requested', data: record });
});

/** PATCH /attendance/:id/regularize — HR/Manager approves or rejects. */
const reviewRegularization = asyncHandler(async (req, res) => {
  const { decision, status } = req.body; // decision: approved|rejected, status: new attendance status if approved
  const record = await Attendance.findById(req.params.id);
  if (!record) throw ApiError.notFound('Attendance record not found');

  record.regularization.status = decision;
  record.regularization.reviewedBy = req.user.id;
  if (decision === 'approved' && status) record.status = status;
  await record.save();
  await audit.record(req, { action: 'attendance.regularize_review', entity: 'Attendance', entityId: record._id, meta: { decision } });
  return ok(res, { message: `Regularization ${decision}`, data: record });
});

module.exports = { checkIn, checkOut, mark, list, monthly, requestRegularization, reviewRegularization };
