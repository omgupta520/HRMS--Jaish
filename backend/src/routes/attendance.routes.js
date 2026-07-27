const express = require('express');
const ctrl = require('../controllers/attendance.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, scopeToCompany } = require('../middleware/rbac');
const { ROLES } = require('../config/roles');

const router = express.Router();
router.use(authenticate, scopeToCompany);

const hrOrManager = authorize(ROLES.SUPER_ADMIN, ROLES.HR, ROLES.MANAGER);

router.post('/check-in', ctrl.checkIn);
router.post('/check-out', ctrl.checkOut);
router.post('/mark', hrOrManager, ctrl.mark);
router.get('/', ctrl.list);
router.get('/monthly', ctrl.monthly);
router.post('/:id/regularize', ctrl.requestRegularization);
router.patch('/:id/regularize', hrOrManager, ctrl.reviewRegularization);

module.exports = router;
