/**
 * Seed script. Creates a Super Admin plus a fully populated demo company
 * (departments, designations, shifts, leave types, holidays, and the HR /
 * Manager / Employee demo logins with sample attendance, leave and payslip).
 *
 *   npm run seed            # wipe + reseed
 *   npm run seed:destroy    # wipe only
 */
require('dotenv').config();
const mongoose = require('mongoose');
const dayjs = require('dayjs');

const connectDB = require('../config/db');
const logger = require('../utils/logger');
const { ROLES } = require('../config/roles');
const { buildEmployeeId } = require('../utils/ids');

const Company = require('../models/Company');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Branch = require('../models/Branch');
const Shift = require('../models/Shift');
const Holiday = require('../models/Holiday');
const LeaveType = require('../models/LeaveType');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payslip = require('../models/Payslip');
const Announcement = require('../models/Announcement');

const MODELS = [
  Company, User, Employee, Department, Designation, Branch, Shift,
  Holiday, LeaveType, Attendance, Leave, Payslip, Announcement,
];

async function destroy() {
  await Promise.all(MODELS.map((m) => m.deleteMany({})));
  logger.info('All collections cleared.');
}

/** Create a User + linked Employee in one step. */
async function createPerson({ company, name, email, password, role, employeeId, extra = {} }) {
  const user = await User.create({ name, email, password, role, company: company?._id || null });
  const [firstName, ...rest] = name.split(' ');
  const employee = await Employee.create({
    company: company._id,
    user: user._id,
    employeeId,
    firstName,
    lastName: rest.join(' '),
    email,
    joiningDate: dayjs().subtract(6, 'month').toDate(),
    ...extra,
  });
  user.employee = employee._id;
  await user.save();
  return { user, employee };
}

async function seed() {
  await destroy();

  // ---- Super Admin (no company) ----
  await User.create({
    name: 'Super Admin',
    email: 'superadmin@hrms.com',
    password: 'Admin@123',
    role: ROLES.SUPER_ADMIN,
  });
  logger.info('Created Super Admin: superadmin@hrms.com / Admin@123');

  // ---- Demo company ----
  const company = await Company.create({
    name: 'Acme Corporation',
    code: 'ACME',
    email: 'contact@acme.com',
    phone: '+1-555-0100',
    address: { city: 'San Francisco', state: 'CA', country: 'USA', zip: '94105' },
    settings: { currency: 'USD' },
  });

  // Master data
  const [engineering, hrDept, sales] = await Department.create([
    { company: company._id, name: 'Engineering', description: 'Product engineering' },
    { company: company._id, name: 'Human Resources', description: 'People operations' },
    { company: company._id, name: 'Sales', description: 'Revenue & growth' },
  ]);

  const [seniorEng, hrManagerDes, salesExec] = await Designation.create([
    { company: company._id, title: 'Senior Engineer', level: 3, department: engineering._id },
    { company: company._id, title: 'HR Manager', level: 4, department: hrDept._id },
    { company: company._id, title: 'Sales Executive', level: 2, department: sales._id },
  ]);

  const branch = await Branch.create({
    company: company._id, name: 'Head Office', code: 'HO', isHeadOffice: true,
    address: { city: 'San Francisco', country: 'USA' },
  });

  const shift = await Shift.create({
    company: company._id, name: 'General', startTime: '09:00', endTime: '18:00', graceMinutes: 15,
  });

  await Holiday.create([
    { company: company._id, name: 'New Year', date: dayjs().month(0).date(1).toDate(), type: 'public' },
    { company: company._id, name: 'Independence Day', date: dayjs().month(6).date(4).toDate(), type: 'public' },
  ]);

  const [casual, sick, earned] = await LeaveType.create([
    { company: company._id, name: 'Casual Leave', code: 'CL', annualQuota: 12, isPaid: true, color: '#6366f1' },
    { company: company._id, name: 'Sick Leave', code: 'SL', annualQuota: 8, isPaid: true, color: '#ef4444' },
    { company: company._id, name: 'Earned Leave', code: 'EL', annualQuota: 15, isPaid: true, color: '#16a34a' },
  ]);

  const leaveBalances = [
    { leaveType: casual._id, balance: 12 },
    { leaveType: sick._id, balance: 8 },
    { leaveType: earned._id, balance: 15 },
  ];

  const commonJob = {
    department: engineering._id,
    designation: seniorEng._id,
    branch: branch._id,
    shift: shift._id,
    leaveBalances,
    salary: { basic: 5000, hra: 2000, allowances: 1000, pf: 600, esi: 100, tds: 400 },
  };

  // ---- HR / Company Admin ----
  const hr = await createPerson({
    company,
    name: 'Hannah Reese',
    email: 'hr@acme.com',
    password: 'Hr@1234',
    role: ROLES.HR,
    employeeId: buildEmployeeId('ACME', 1),
    extra: { department: hrDept._id, designation: hrManagerDes._id, branch: branch._id, shift: shift._id, leaveBalances, salary: { basic: 6000, hra: 2400, allowances: 1200, pf: 720, tds: 500 } },
  });

  // ---- Manager ----
  const manager = await createPerson({
    company,
    name: 'Marcus Lee',
    email: 'manager@acme.com',
    password: 'Manager@123',
    role: ROLES.MANAGER,
    employeeId: buildEmployeeId('ACME', 2),
    extra: commonJob,
  });

  // ---- Employee (reports to Manager) ----
  const employee = await createPerson({
    company,
    name: 'Emily Carter',
    email: 'employee@acme.com',
    password: 'Employee@123',
    role: ROLES.EMPLOYEE,
    employeeId: buildEmployeeId('ACME', 3),
    extra: { ...commonJob, reportingManager: manager.employee._id, phone: '+1-555-0133', dateOfBirth: dayjs().subtract(28, 'year').toDate() },
  });

  // Two more employees under the manager for nicer dashboards.
  const extras = await Promise.all([
    createPerson({ company, name: 'David Kim', email: 'david@acme.com', password: 'Employee@123', role: ROLES.EMPLOYEE, employeeId: buildEmployeeId('ACME', 4), extra: { ...commonJob, department: sales._id, designation: salesExec._id, reportingManager: manager.employee._id } }),
    createPerson({ company, name: 'Sara Patel', email: 'sara@acme.com', password: 'Employee@123', role: ROLES.EMPLOYEE, employeeId: buildEmployeeId('ACME', 5), extra: { ...commonJob, reportingManager: manager.employee._id } }),
  ]);

  company.employeeSequence = 5;
  await company.save();
  engineering.head = manager.employee._id;
  await engineering.save();

  // ---- Sample attendance for the last 5 working days ----
  const people = [hr.employee, manager.employee, employee.employee, ...extras.map((e) => e.employee)];
  const attendanceDocs = [];
  for (let d = 1; d <= 5; d += 1) {
    const day = dayjs().subtract(d, 'day').startOf('day');
    if ([0, 6].includes(day.day())) continue; // skip weekends
    people.forEach((p, idx) => {
      const absent = d === 2 && idx === 2; // make Emily absent one day
      attendanceDocs.push({
        company: company._id,
        employee: p._id,
        date: day.toDate(),
        checkIn: absent ? undefined : day.hour(9).minute(idx * 3).toDate(),
        checkOut: absent ? undefined : day.hour(18).minute(0).toDate(),
        status: absent ? 'absent' : 'present',
        isLate: idx * 3 > 15,
        workedHours: absent ? 0 : 9,
        shift: shift._id,
      });
    });
  }
  await Attendance.insertMany(attendanceDocs);

  // ---- Sample leave (pending) ----
  await Leave.create({
    company: company._id,
    employee: employee.employee._id,
    leaveType: casual._id,
    startDate: dayjs().add(3, 'day').toDate(),
    endDate: dayjs().add(4, 'day').toDate(),
    days: 2,
    reason: 'Family function',
    isPaid: true,
    status: 'pending',
  });

  // ---- Sample payslip for last month ----
  const lastMonth = dayjs().subtract(1, 'month');
  await Payslip.create({
    company: company._id,
    employee: employee.employee._id,
    month: lastMonth.month() + 1,
    year: lastMonth.year(),
    workingDays: lastMonth.daysInMonth(),
    paidDays: lastMonth.daysInMonth(),
    lopDays: 0,
    earnings: { basic: 5000, hra: 2000, allowances: 1000, bonus: 0 },
    deductions: { pf: 600, esi: 100, tds: 400, lop: 0, other: 0 },
    grossEarnings: 8000,
    totalDeductions: 1100,
    netPay: 6900,
    status: 'paid',
    paidAt: lastMonth.endOf('month').toDate(),
  });

  // ---- Welcome announcement ----
  await Announcement.create({
    company: company._id,
    title: 'Welcome to the HRMS Portal',
    body: 'Our new HR portal is live! Use it to manage attendance, apply for leave, and download payslips.',
    audience: 'company',
    priority: 'important',
    createdBy: hr.user._id,
  });

  logger.info('Seed complete. Demo logins:');
  logger.info('  Super Admin : superadmin@hrms.com / Admin@123');
  logger.info('  HR / Admin  : hr@acme.com / Hr@1234');
  logger.info('  Manager     : manager@acme.com / Manager@123');
  logger.info('  Employee    : employee@acme.com / Employee@123');
}

(async () => {
  try {
    await connectDB();
    if (process.argv.includes('--destroy')) {
      await destroy();
    } else {
      await seed();
    }
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    logger.error(`Seed failed: ${err.message}`);
    logger.error(err.stack);
    process.exit(1);
  }
})();
