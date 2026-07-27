const express = require('express');
const ctrl = require('../controllers/document.controller');
const { authenticate } = require('../middleware/auth');
const { scopeToCompany } = require('../middleware/rbac');
const { upload } = require('../middleware/upload');

const router = express.Router();
router.use(authenticate, scopeToCompany);

router.get('/', ctrl.list);
router.post('/', upload.single('file'), ctrl.upload);
router.get('/:id/download', ctrl.download);
router.delete('/:id', ctrl.remove);

module.exports = router;
