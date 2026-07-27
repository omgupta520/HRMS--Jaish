const express = require('express');
const ctrl = require('../controllers/announcement.controller');
const { authenticate } = require('../middleware/auth');
const { authorize, scopeToCompany } = require('../middleware/rbac');
const { ROLES } = require('../config/roles');

const router = express.Router();
router.use(authenticate, scopeToCompany);

router.get('/', ctrl.list);
router.get('/unread-count', ctrl.unreadCount);
router.patch('/:id/read', ctrl.markRead);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.HR), ctrl.create);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.HR), ctrl.remove);

module.exports = router;
