const express = require('express');
const ctrl = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');
const { scopeToCompany } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate, scopeToCompany);
router.get('/', ctrl.get);

module.exports = router;
