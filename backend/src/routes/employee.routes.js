const express = require('express');
const ctrl = require('../controllers/employee.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, scopeToCompany } = require('../middleware/rbac');
const { ROLES } = require('../config/roles');

const router = express.Router();
router.use(authenticate, scopeToCompany);

const hrOnly = authorize(ROLES.SUPER_ADMIN, ROLES.HR);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', hrOnly, ctrl.create);
router.put('/:id', hrOnly, ctrl.update);
router.patch('/:id/status', hrOnly, ctrl.changeStatus);
router.delete('/:id', hrOnly, ctrl.remove);

module.exports = router;
