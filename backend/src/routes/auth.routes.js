const express = require('express');
const ctrl = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const schema = require('../validations/auth.validation');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register-company', validate(schema.registerCompany), ctrl.registerCompany);
router.post('/login', validate(schema.login), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/forgot-password', validate(schema.forgotPassword), ctrl.forgotPassword);
router.post('/reset-password', validate(schema.resetPassword), ctrl.resetPassword);

// Authenticated
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.post('/change-password', authenticate, validate(schema.changePassword), ctrl.changePassword);

module.exports = router;
