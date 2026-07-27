const express = require('express');
const ctrl = require('../controllers/company.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, scopeToCompany } = require('../middleware/rbac');
const { ROLES } = require('../config/roles');

const router = express.Router();
router.use(authenticate, scopeToCompany);

router.get('/me', ctrl.getMine);
router.put('/me', authorize(ROLES.SUPER_ADMIN, ROLES.HR), ctrl.update);

// Super Admin tenant management
router.get('/', authorize(ROLES.SUPER_ADMIN), ctrl.list);
router.get('/:id', authorize(ROLES.SUPER_ADMIN), ctrl.getOne);
router.put('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.HR), ctrl.update);
router.patch('/:id/active', authorize(ROLES.SUPER_ADMIN), ctrl.toggleActive);

module.exports = router;
