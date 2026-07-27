/**
 * Reports module. Each report supports JSON output and CSV export (?format=csv).
 * Reports are always scoped to the requester's company (or a chosen company for
 * Super Admin).
 */
const dayjs = require('dayjs');

const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payslip = require('../models/Payslip');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/ApiResponse');
const { ROLES } = require('../config/roles');

function companyFilter(req) {
  if (req.user.role === ROLES.SUPER_ADMIN) {
    if (!req.companyScope) throw ApiError.badRequest('Super Admin must pass companyId for reports');
    return { company: req.companyScope };
  }
  return { company: req.user.company };
}

/** Convert an array of flat objects to CSV text. */
function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  rows.forEach((r) => lines.push(headers.map((h) => escape(r[h])).join(',')));
  return lines.join('\n');
}

/** Respond as CSV download or JSON depending on ?format. */
function respond(req, res, name, rows) {
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${name}.csv"`);
    return res.send(toCsv(rows));
  }
  return ok(res, { data: rows });
}

/** GET /reports/employees */
const employees = asyncHandler(async (req, res) => {
  const docs = await Employee.find(companyFilter(req))
    .populate('department', 'name')
    .populate('designation', 'title')
    .lean();
  const rows = docs.map((e) => ({
    employeeId: e.employeeId,
    name: `${e.firstName} ${e.lastName || ''}`.trim(),
    email: e.email,
    department: e.department?.name || '',
    designation: e.designation?.title || '',
    employmentType: e.employmentType,
    status: e.status,
    joiningDate: dayjs(e.joiningDate).format('YYYY-MM-DD'),
  }));
  return respond(req, res, 'employee-report', rows);
});

/** GET /reports/attendance?from=&to= */
const attendance = asyncHandler(async (req, res) => {
  const filter = companyFilter(req);
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = dayjs(req.query.from).startOf('day').toDate();
    if (req.query.to) filter.date.$lte = dayjs(req.query.to).endOf('day').toDate();
  }
  const docs = await Attendance.find(filter).populate('employee', 'firstName lastName employeeId').lean();
  const rows = docs.map((a) => ({
    employeeId: a.employee?.employeeId || '',
    name: a.employee ? `${a.employee.firstName} ${a.employee.lastName || ''}`.trim() : '',
    date: dayjs(a.date).format('YYYY-MM-DD'),
    status: a.status,
    checkIn: a.checkIn ? dayjs(a.checkIn).format('HH:mm') : '',
    checkOut: a.checkOut ? dayjs(a.checkOut).format('HH:mm') : '',
    workedHours: a.workedHours,
    isLate: a.isLate ? 'Yes' : 'No',
  }));
  return respond(req, res, 'attendance-report', rows);
});

/** GET /reports/leaves?status= */
const leaves = asyncHandler(async (req, res) => {
  const filter = companyFilter(req);
  if (req.query.status) filter.status = req.query.status;
  const docs = await Leave.find(filter)
    .populate('employee', 'firstName lastName employeeId')
    .populate('leaveType', 'name')
    .lean();
  const rows = docs.map((l) => ({
    employeeId: l.employee?.employeeId || '',
    name: l.employee ? `${l.employee.firstName} ${l.employee.lastName || ''}`.trim() : '',
    leaveType: l.leaveType?.name || '',
    from: dayjs(l.startDate).format('YYYY-MM-DD'),
    to: dayjs(l.endDate).format('YYYY-MM-DD'),
    days: l.days,
    status: l.status,
  }));
  return respond(req, res, 'leave-report', rows);
});

/** GET /reports/payroll?month=&year= */
const payroll = asyncHandler(async (req, res) => {
  const filter = companyFilter(req);
  if (req.query.month) filter.month = parseInt(req.query.month, 10);
  if (req.query.year) filter.year = parseInt(req.query.year, 10);
  const docs = await Payslip.find(filter).populate('employee', 'firstName lastName employeeId').lean();
  const rows = docs.map((p) => ({
    employeeId: p.employee?.employeeId || '',
    name: p.employee ? `${p.employee.firstName} ${p.employee.lastName || ''}`.trim() : '',
    period: `${String(p.month).padStart(2, '0')}/${p.year}`,
    grossEarnings: p.grossEarnings,
    totalDeductions: p.totalDeductions,
    netPay: p.netPay,
    status: p.status,
  }));
  return respond(req, res, 'payroll-report', rows);
});

/** GET /reports/departments — employee count per department. */
const departments = asyncHandler(async (req, res) => {
  const filter = companyFilter(req);
  const rows = await Employee.aggregate([
    { $match: filter },
    { $group: { _id: '$department', count: { $sum: 1 } } },
  ]);
  const populated = await Employee.populate(rows, { path: '_id', select: 'name' });
  const out = populated.map((r) => ({ department: r._id?.name || 'Unassigned', employees: r.count }));
  return respond(req, res, 'department-report', out);
});

module.exports = { employees, attendance, leaves, payroll, departments };
