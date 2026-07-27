const express = require('express');
const ctrl = require('../controllers/leave.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, scopeToCompany } = require('../middleware/rbac');
const { ROLES } = require('../config/roles');

const router = express.Router();
router.use(authenticate, scopeToCompany);

router.get('/', ctrl.list);
router.get('/balance', ctrl.balance);
router.get('/calendar', ctrl.calendar);
router.post('/', ctrl.apply);
router.patch('/:id/manager', authorize(ROLES.SUPER_ADMIN, ROLES.HR, ROLES.MANAGER), ctrl.managerAction);
router.patch('/:id/hr', authorize(ROLES.SUPER_ADMIN, ROLES.HR), ctrl.hrAction);
router.patch('/:id/cancel', ctrl.cancel);

module.exports = router;
