/**
 * Payroll management: generate a monthly payroll run (one payslip per active
 * employee), list/inspect payslips, advance payroll status, and download a
 * payslip as PDF.
 */
const Payroll = require('../models/Payroll');
const Payslip = require('../models/Payslip');
const Employee = require('../models/Employee');
const Company = require('../models/Company');

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/ApiResponse');
const { getPagination, buildMeta } = require('../utils/pagination');
const { computePayslip } = require('../services/payroll.service');
const { streamPayslipPdf } = require('../services/pdf.service');
const { ROLES } = require('../config/roles');
const audit = require('../services/audit.service');

function companyOf(req) {
  if (req.user.role === ROLES.SUPER_ADMIN) return req.companyScope || req.body.company;
  return req.user.company;
}

/** POST /payroll/generate { month, year } — (re)generate the run as draft. */
const generate = asyncHandler(async (req, res) => {
  const companyId = companyOf(req);
  if (!companyId) throw ApiError.badRequest('Company is required');
  const month = parseInt(req.body.month, 10);
  const year = parseInt(req.body.year, 10);
  if (!month || !year) throw ApiError.badRequest('month and year are required');

  let run = await Payroll.findOne({ company: companyId, month, year });
  if (run && run.status === 'paid') throw ApiError.conflict('Payroll for this period is already paid');

  const employees = await Employee.find({ company: companyId, status: { $in: ['active', 'on_notice'] } });
  const company = await Company.findById(companyId);

  const payslipIds = [];
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;

  // Compute and upsert a payslip per employee.
  for (const employee of employees) {
    // eslint-disable-next-line no-await-in-loop
    const data = await computePayslip(employee, month, year, companyId);
    // eslint-disable-next-line no-await-in-loop
    const payslip = await Payslip.findOneAndUpdate(
      { employee: employee._id, month, year },
      { $set: { ...data, status: 'draft', generatedBy: req.user.id } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    payslipIds.push(payslip._id);
    totalGross += payslip.grossEarnings;
    totalDeductions += payslip.totalDeductions;
    totalNet += payslip.netPay;
  }

  run = await Payroll.findOneAndUpdate(
    { company: companyId, month, year },
    {
      $set: {
        status: 'draft',
        totalEmployees: employees.length,
        totalGross,
        totalDeductions,
        totalNet,
        payslips: payslipIds,
        processedBy: req.user.id,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await audit.record(req, { action: 'payroll.generate', entity: 'Payroll', entityId: run._id, meta: { month, year } });
  return created(res, { message: `Payroll generated for ${month}/${year}`, data: run });
});

/** PATCH /payroll/:id/status { status } — advance draft -> processed -> paid. */
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // processed | paid
  const filter = { _id: req.params.id };
  if (req.user.role !== ROLES.SUPER_ADMIN) filter.company = req.user.company;

  const run = await Payroll.findOne(filter);
  if (!run) throw ApiError.notFound('Payroll run not found');

  run.status = status;
  await run.save();
  // Cascade status to all payslips in the run.
  const update = { status };
  if (status === 'paid') update.paidAt = new Date();
  await Payslip.updateMany({ _id: { $in: run.payslips } }, { $set: update });

  await audit.record(req, { action: 'payroll.status', entity: 'Payroll', entityId: run._id, meta: { status } });
  return ok(res, { message: `Payroll marked ${status}`, data: run });
});

/** GET /payroll — list payroll runs. */
const listRuns = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.user.role !== ROLES.SUPER_ADMIN) filter.company = req.user.company;
  else if (req.companyScope) filter.company = req.companyScope;
  if (req.query.year) filter.year = parseInt(req.query.year, 10);

  const [items, total] = await Promise.all([
    Payroll.find(filter).sort({ year: -1, month: -1 }).skip(skip).limit(limit),
    Payroll.countDocuments(filter),
  ]);
  return ok(res, { data: items, meta: buildMeta({ page, limit, total }) });
});

/** GET /payroll/payslips — list payslips (role-scoped). */
const listPayslips = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = {};
  if (req.user.role !== ROLES.SUPER_ADMIN) filter.company = req.user.company;

  if (req.user.role === ROLES.EMPLOYEE) filter.employee = req.user.employee;
  else if (req.query.employee) filter.employee = req.query.employee;

  if (req.query.month) filter.month = parseInt(req.query.month, 10);
  if (req.query.year) filter.year = parseInt(req.query.year, 10);

  const [items, total] = await Promise.all([
    Payslip.find(filter).populate('employee', 'firstName lastName employeeId').sort({ year: -1, month: -1 }).skip(skip).limit(limit),
    Payslip.countDocuments(filter),
  ]);
  return ok(res, { data: items, meta: buildMeta({ page, limit, total }) });
});

/** GET /payroll/payslips/:id */
const getPayslip = asyncHandler(async (req, res) => {
  const payslip = await Payslip.findById(req.params.id).populate('employee');
  if (!payslip) throw ApiError.notFound('Payslip not found');
  // Employees can only view their own.
  if (req.user.role === ROLES.EMPLOYEE && String(payslip.employee._id) !== String(req.user.employee)) {
    throw ApiError.forbidden();
  }
  if (req.user.role !== ROLES.SUPER_ADMIN && String(payslip.company) !== String(req.user.company)) {
    throw ApiError.forbidden();
  }
  return ok(res, { data: payslip });
});

/** GET /payroll/payslips/:id/pdf — download payslip as PDF. */
const downloadPayslip = asyncHandler(async (req, res) => {
  const payslip = await Payslip.findById(req.params.id).populate('employee');
  if (!payslip) throw ApiError.notFound('Payslip not found');
  if (req.user.role === ROLES.EMPLOYEE && String(payslip.employee._id) !== String(req.user.employee)) {
    throw ApiError.forbidden();
  }
  const company = await Company.findById(payslip.company);
  streamPayslipPdf(res, { company, employee: payslip.employee, payslip });
});

module.exports = { generate, updateStatus, listRuns, listPayslips, getPayslip, downloadPayslip };
