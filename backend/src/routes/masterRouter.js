/**
 * Builds a REST router for a master-data model using crudFactory.
 * Read access: any authenticated user in the company.
 * Write access: HR (and Super Admin).
 */
const express = require('express');
const crudFactory = require('../utils/crudFactory');
const { authenticate } = require('../middleware/auth');
const { authorize, scopeToCompany } = require('../middleware/rbac');
const { ROLES } = require('../config/roles');

function buildMasterRouter(Model, opts) {
  const router = express.Router();
  const handlers = crudFactory(Model, opts);
  const writers = authorize(ROLES.SUPER_ADMIN, ROLES.HR);

  router.use(authenticate, scopeToCompany);

  router.get('/', handlers.list);
  router.get('/:id', handlers.getOne);
  router.post('/', writers, handlers.create);
  router.put('/:id', writers, handlers.update);
  router.delete('/:id', writers, handlers.remove);

  return router;
}

module.exports = buildMasterRouter;
