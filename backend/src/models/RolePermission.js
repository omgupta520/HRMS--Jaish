const mongoose = require('mongoose');
const { ROLE_VALUES } = require('../config/roles');

/**
 * Per-company override of what each role can do. The base RBAC matrix lives in
 * code (middleware/permissions.js); this model lets a company customize it.
 * `permissions` is a list of "module:action" strings, e.g. "employee:create".
 */
const rolePermissionSchema = new mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    role: { type: String, enum: ROLE_VALUES, required: true },
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
);

rolePermissionSchema.index({ company: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
