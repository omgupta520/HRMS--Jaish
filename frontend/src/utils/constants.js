// Role constants mirroring the backend.
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  hr: 'HR / Admin',
  manager: 'Manager',
  employee: 'Employee',
};

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'intern', label: 'Intern' },
  { value: 'contract', label: 'Contract' },
];

export const EMPLOYEE_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'on_notice', label: 'On Notice' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'terminated', label: 'Terminated' },
];

// Tailwind classes for status badges.
export const STATUS_COLORS = {
  present: 'bg-green-100 text-green-700',
  wfh: 'bg-sky-100 text-sky-700',
  absent: 'bg-red-100 text-red-700',
  half_day: 'bg-amber-100 text-amber-700',
  on_leave: 'bg-purple-100 text-purple-700',
  pending: 'bg-amber-100 text-amber-700',
  manager_approved: 'bg-sky-100 text-sky-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-600',
  draft: 'bg-slate-200 text-slate-600',
  processed: 'bg-sky-100 text-sky-700',
  paid: 'bg-green-100 text-green-700',
  active: 'bg-green-100 text-green-700',
};

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
