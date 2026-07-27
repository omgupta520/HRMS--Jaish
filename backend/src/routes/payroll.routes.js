const express = require('express');
const ctrl = require('../controllers/payroll.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, scopeToCompany } = require('../middleware/rbac');
const { ROLES } = require('../config/roles');

const router = express.Router();
router.use(authenticate, scopeToCompany);

const hrOnly = authorize(ROLES.SUPER_ADMIN, ROLES.HR);

// Payslips (employees can read their own)
router.get('/payslips', ctrl.listPayslips);
router.get('/payslips/:id', ctrl.getPayslip);
router.get('/payslips/:id/pdf', ctrl.downloadPayslip);

// Payroll runs (HR only)
router.get('/', hrOnly, ctrl.listRuns);
router.post('/generate', hrOnly, ctrl.generate);
router.patch('/:id/status', hrOnly, ctrl.updateStatus);

module.exports = router;
