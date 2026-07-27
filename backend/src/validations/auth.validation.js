const { z } = require('zod');

const registerCompany = z.object({
  body: z.object({
    companyName: z.string().min(2, 'Company name is required'),
    adminName: z.string().min(2, 'Admin name is required'),
    email: z.string().email('Valid email required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional(),
  }),
});

const login = z.object({
  body: z.object({
    email: z.string().email('Valid email required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

const forgotPassword = z.object({
  body: z.object({ email: z.string().email('Valid email required') }),
});

const resetPassword = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

const changePassword = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

module.exports = { registerCompany, login, forgotPassword, resetPassword, changePassword };
