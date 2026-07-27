const express = require('express');
const ctrl = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, scopeToCompany } = require('../middleware/rbac');
const { ROLES } = require('../config/roles');

const router = express.Router();
router.use(authenticate, scopeToCompany, authorize(ROLES.SUPER_ADMIN, ROLES.HR, ROLES.MANAGER));

router.get('/employees', ctrl.employees);
router.get('/attendance', ctrl.attendance);
router.get('/leaves', ctrl.leaves);
router.get('/payroll', authorize(ROLES.SUPER_ADMIN, ROLES.HR), ctrl.payroll);
router.get('/departments', ctrl.departments);

module.exports = router;
