/**
 * Dashboard aggregation endpoints. Returns a different payload per role.
 */
const dayjs = require('dayjs');

const Company = require('../models/Company');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const User = require('../models/User');
const Payslip = require('../models/Payslip');
const Announcement = require('../models/Announcement');

const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/ApiResponse');
const { startOfDay } = require('../services/date.service');
const { ROLES } = require('../config/roles');

/** Attendance counts for a company on a given day. */
async function attendanceCounts(companyId, day) {
  const rows = await Attendance.aggregate([
    { $match: { company: companyId, date: day } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return {
    present: (map.present || 0) + (map.wfh || 0),
    absent: map.absent || 0,
    onLeave: map.on_leave || 0,
    halfDay: map.half_day || 0,
  };
}

/** Last 7 days present-count trend for charts. */
async function weeklyTrend(companyId) {
  const start = startOfDay(dayjs().subtract(6, 'day').toDate());
  const rows = await Attendance.aggregate([
    { $match: { company: companyId, date: { $gte: start }, status: { $in: ['present', 'wfh'] } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  const map = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return Array.from({ length: 7 }).map((_, i) => {
    const d = dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD');
    return { date: d, present: map[d] || 0 };
  });
}

const get = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const today = startOfDay(new Date());

  // ---- Super Admin ----
  if (role === ROLES.SUPER_ADMIN) {
    const [totalCompanies, activeCompanies, totalUsers, totalEmployees] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ isActive: true }),
      User.countDocuments(),
      Employee.countDocuments(),
    ]);
    const recentCompanies = await Company.find().sort('-createdAt').limit(5).lean();
    return ok(res, {
      data: {
        role,
        stats: {
          totalCompanies,
          activeCompanies,
          totalUsers,
          totalEmployees,
          revenue: activeCompanies * 49, // placeholder MRR ($49/active company)
        },
        recentCompanies,
      },
    });
  }

  const companyId = req.user.company;

  // ---- HR / Company Admin ----
  if (role === ROLES.HR) {
    const [totalEmployees, attendance, pendingLeaves, deptCounts] = await Promise.all([
      Employee.countDocuments({ company: companyId, status: 'active' }),
      attendanceCounts(companyId, today),
      Leave.countDocuments({ company: companyId, status: { $in: ['pending', 'manager_approved'] } }),
      Employee.aggregate([
        { $match: { company: companyId } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
      ]),
    ]);

    const monthStart = dayjs().startOf('month').toDate();
    const [newJoiners, trend] = await Promise.all([
      Employee.find({ company: companyId, joiningDate: { $gte: monthStart } })
        .select('firstName lastName employeeId joiningDate')
        .limit(5),
      weeklyTrend(companyId),
    ]);

    // Upcoming birthdays in the next 30 days (month/day comparison).
    const employees = await Employee.find({ company: companyId, dateOfBirth: { $ne: null } }).select('firstName lastName dateOfBirth');
    const upcomingBirthdays = employees
      .map((e) => {
        const next = dayjs(e.dateOfBirth).year(dayjs().year());
        const adjusted = next.isBefore(dayjs(), 'day') ? next.add(1, 'year') : next;
        return { name: `${e.firstName} ${e.lastName || ''}`.trim(), date: adjusted.format('YYYY-MM-DD'), diff: adjusted.diff(dayjs(), 'day') };
      })
      .filter((b) => b.diff <= 30)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5);

    // Resolve department names for the chart.
    const populatedDepts = await Employee.populate(deptCounts, { path: '_id', select: 'name' });
    const departmentDistribution = populatedDepts.map((d) => ({
      department: d._id?.name || 'Unassigned',
      count: d.count,
    }));

    return ok(res, {
      data: {
        role,
        stats: { totalEmployees, ...attendance, pendingLeaves },
        weeklyTrend: trend,
        departmentDistribution,
        newJoiners,
        upcomingBirthdays,
      },
    });
  }

  // ---- Manager ----
  if (role === ROLES.MANAGER) {
    const team = await Employee.find({ reportingManager: req.user.employee }).select('_id firstName lastName employeeId');
    const teamIds = team.map((t) => t._id);
    const [presentToday, pendingApprovals] = await Promise.all([
      Attendance.countDocuments({ employee: { $in: teamIds }, date: today, status: { $in: ['present', 'wfh'] } }),
      Leave.countDocuments({ employee: { $in: teamIds }, status: 'pending' }),
    ]);
    const teamLeaves = await Leave.find({ employee: { $in: teamIds }, status: { $in: ['approved', 'manager_approved'] } })
      .populate('employee', 'firstName lastName')
      .populate('leaveType', 'name color')
      .sort('-startDate')
      .limit(10);
    return ok(res, {
      data: {
        role,
        stats: { teamSize: team.length, presentToday, pendingApprovals },
        team,
        teamLeaves,
      },
    });
  }

  // ---- Employee ----
  const employeeId = req.user.employee;
  const monthStart = dayjs().startOf('month').toDate();
  const [monthAttendance, myLeaves, payslips, announcements] = await Promise.all([
    Attendance.find({ employee: employeeId, date: { $gte: monthStart } }),
    Leave.find({ employee: employeeId }).populate('leaveType', 'name color').sort('-createdAt').limit(5),
    Payslip.find({ employee: employeeId }).sort({ year: -1, month: -1 }).limit(3),
    Announcement.find({ company: companyId, isActive: true }).sort('-createdAt').limit(5),
  ]);
  const present = monthAttendance.filter((a) => ['present', 'wfh'].includes(a.status)).length;
  const employee = await Employee.findById(employeeId);
  // Simple profile-completion score.
  const fields = ['phone', 'dateOfBirth', 'address', 'pan'];
  const filled = fields.filter((f) => employee && employee[f]).length + (employee?.bank?.accountNumber ? 1 : 0);
  const profileCompletion = Math.round((filled / (fields.length + 1)) * 100);

  return ok(res, {
    data: {
      role,
      stats: {
        presentThisMonth: present,
        pendingLeaves: myLeaves.filter((l) => ['pending', 'manager_approved'].includes(l.status)).length,
        payslips: payslips.length,
        profileCompletion,
      },
      myLeaves,
      payslips,
      announcements,
    },
  });
});

module.exports = { get };
