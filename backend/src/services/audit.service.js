/**
 * Audit logging service. Fire-and-forget so it never blocks the request path.
 */
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

async function record(req, { action, entity, entityId, meta }) {
  try {
    await AuditLog.create({
      company: req.user?.company || req.companyScope || null,
      actor: req.user?.id || null,
      actorName: req.user?.name || 'system',
      action,
      entity,
      entityId,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      meta,
    });
  } catch (err) {
    logger.warn(`Audit log failed for ${action}: ${err.message}`);
  }
}

module.exports = { record };
