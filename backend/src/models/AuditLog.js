const mongoose = require('mongoose');

/**
 * Append-only audit trail of meaningful actions (login, create/update/delete,
 * approvals, payroll runs). Written by the audit middleware/service.
 */
const auditLogSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String },
    action: { type: String, required: true }, // e.g. "leave.approve"
    entity: { type: String }, // e.g. "Leave"
    entityId: { type: mongoose.Schema.Types.ObjectId },
    method: { type: String },
    path: { type: String },
    ip: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
