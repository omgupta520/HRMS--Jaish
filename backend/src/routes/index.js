/**
 * Root API router — mounts every module under /api/v1.
 */
const express = require('express');

const auth = require('./auth.routes');
const company = require('./company.routes');
const master = require('./master.routes');
const employee = require('./employee.routes');
const attendance = require('./attendance.routes');
const leave = require('./leave.routes');
const payroll = require('./payroll.routes');
const announcement = require('./announcement.routes');
const document = require('./document.routes');
const dashboard = require('./dashboard.routes');
const report = require('./report.routes');

const { authenticate } = require('../middleware/auth');
const { authorize, scopeToCompany } = require('../middleware/rbac');
const { ROLES } = require('../config/roles');
const auditCtrl = require('../controllers/audit.controller');

const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'HRMS API healthy', time: new Date() }));

router.use('/auth', auth);
router.use('/companies', company);
router.use('/employees', employee);
router.use('/attendance', attendance);
router.use('/leaves', leave);
router.use('/payroll', payroll);
router.use('/announcements', announcement);
router.use('/documents', document);
router.use('/dashboard', dashboard);
router.use('/reports', report);

// Master data (departments, designations, branches, shifts, holidays, leave-types)
router.use('/', master);

// Audit logs
router.get(
  '/audit-logs',
  authenticate,
  scopeToCompany,
  authorize(ROLES.SUPER_ADMIN, ROLES.HR),
  auditCtrl.list
);

module.exports = router;
