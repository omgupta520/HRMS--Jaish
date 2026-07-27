/**
 * Thin typed wrappers around the REST API, grouped by module.
 */
import api from './client';

export const authApi = {
  login: (body) => api.post('/auth/login', body),
  registerCompany: (body) => api.post('/auth/register-company', body),
  me: () => api.get('/auth/me'),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  forgot: (body) => api.post('/auth/forgot-password', body),
  reset: (body) => api.post('/auth/reset-password', body),
  changePassword: (body) => api.post('/auth/change-password', body),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export const companyApi = {
  me: () => api.get('/companies/me'),
  update: (body) => api.put('/companies/me', body),
  list: (params) => api.get('/companies', { params }),
  toggleActive: (id, isActive) => api.patch(`/companies/${id}/active`, { isActive }),
};

export const employeeApi = {
  list: (params) => api.get('/employees', { params }),
  get: (id) => api.get(`/employees/${id}`),
  create: (body) => api.post('/employees', body),
  update: (id, body) => api.put(`/employees/${id}`, body),
  changeStatus: (id, status) => api.patch(`/employees/${id}/status`, { status }),
  remove: (id) => api.delete(`/employees/${id}`),
};

export const attendanceApi = {
  list: (params) => api.get('/attendance', { params }),
  checkIn: (body) => api.post('/attendance/check-in', body || {}),
  checkOut: () => api.post('/attendance/check-out', {}),
  mark: (body) => api.post('/attendance/mark', body),
  monthly: (params) => api.get('/attendance/monthly', { params }),
};

export const leaveApi = {
  list: (params) => api.get('/leaves', { params }),
  balance: (params) => api.get('/leaves/balance', { params }),
  calendar: (params) => api.get('/leaves/calendar', { params }),
  apply: (body) => api.post('/leaves', body),
  managerAction: (id, body) => api.patch(`/leaves/${id}/manager`, body),
  hrAction: (id, body) => api.patch(`/leaves/${id}/hr`, body),
  cancel: (id) => api.patch(`/leaves/${id}/cancel`),
};

export const payrollApi = {
  runs: (params) => api.get('/payroll', { params }),
  generate: (body) => api.post('/payroll/generate', body),
  updateStatus: (id, status) => api.patch(`/payroll/${id}/status`, { status }),
  payslips: (params) => api.get('/payroll/payslips', { params }),
  payslip: (id) => api.get(`/payroll/payslips/${id}`),
  payslipPdfUrl: (id) => `/api/v1/payroll/payslips/${id}/pdf`,
};

export const announcementApi = {
  list: (params) => api.get('/announcements', { params }),
  unread: () => api.get('/announcements/unread-count'),
  create: (body) => api.post('/announcements', body),
  markRead: (id) => api.patch(`/announcements/${id}/read`),
  remove: (id) => api.delete(`/announcements/${id}`),
};

export const masterApi = {
  list: (resource, params) => api.get(`/${resource}`, { params }),
  create: (resource, body) => api.post(`/${resource}`, body),
  update: (resource, id, body) => api.put(`/${resource}/${id}`, body),
  remove: (resource, id) => api.delete(`/${resource}/${id}`),
};

export const reportApi = {
  get: (type, params) => api.get(`/reports/${type}`, { params }),
};
