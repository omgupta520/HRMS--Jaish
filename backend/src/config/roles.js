/**
 * Canonical role definitions used across auth, RBAC middleware and seed data.
 */
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  HR: 'hr', // Company Admin / HR
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

const ROLE_VALUES = Object.values(ROLES);

module.exports = { ROLES, ROLE_VALUES };
