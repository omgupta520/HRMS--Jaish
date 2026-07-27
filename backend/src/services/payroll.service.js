/**
 * Payroll computation. Given an employee's salary structure plus attendance for
 * the month, compute a payslip with loss-of-pay for unpaid absences.
 */
const Attendance = require('../models/Attendance');
const { daysInMonth } = require('./date.service');
const dayjs = require('dayjs');

/**
 * Compute payslip numbers for one employee for a month/year.
 * LOP (loss of pay) days = working days the employee was absent or on unpaid leave.
 */
async function computePayslip(employee, month, year, company) {
  const s = employee.salary || {};
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month').toDate();
  const end = dayjs(start).endOf('month').toDate();

  const records = await Attendance.find({
    employee: employee._id,
    date: { $gte: start, $lte: end },
  }).lean();

  const totalDays = daysInMonth(month, year);
  // Count unpaid/absent days that fall on working days.
  let lopDays = 0;
  records.forEach((r) => {
    if (r.status === 'absent') lopDays += 1;
    else if (r.status === 'half_day') lopDays += 0.5;
  });

  const perDay = (Number(s.basic || 0) + Number(s.hra || 0) + Number(s.allowances || 0)) / totalDays;
  const lopAmount = Math.round(perDay * lopDays);

  const earnings = {
    basic: Number(s.basic || 0),
    hra: Number(s.hra || 0),
    allowances: Number(s.allowances || 0),
    bonus: Number(s.bonus || 0),
  };
  const deductions = {
    pf: Number(s.pf || 0),
    esi: Number(s.esi || 0),
    tds: Number(s.tds || 0),
    other: Number(s.otherDeductions || 0),
    lop: lopAmount,
  };

  const grossEarnings = earnings.basic + earnings.hra + earnings.allowances + earnings.bonus;
  const totalDeductions =
    deductions.pf + deductions.esi + deductions.tds + deductions.other + deductions.lop;
  const netPay = Math.max(grossEarnings - totalDeductions, 0);

  return {
    company: company || employee.company,
    employee: employee._id,
    month,
    year,
    workingDays: totalDays,
    paidDays: totalDays - lopDays,
    lopDays,
    earnings,
    deductions,
    grossEarnings,
    totalDeductions,
    netPay,
  };
}

module.exports = { computePayslip };
