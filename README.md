# HRMS — Human Resource Management System (MERN)

A production-grade, multi-tenant **HRMS SaaS** built with the MERN stack
(MongoDB, Express, React, Node). Companies can manage employees, attendance,
leaves, payroll, departments, documents, announcements and reports with
role-based access control.

---

## ✨ Features

| Module | Highlights |
| --- | --- |
| **Auth & Security** | JWT access + refresh tokens (rotation), bcrypt hashing, forgot/reset password, account status, rate limiting, Helmet, CORS, audit logs |
| **Multi-tenancy** | Every record scoped to a company; Super Admin sees all tenants |
| **Companies** | Profile, settings (attendance/payroll policy), suspend/activate (Super Admin) |
| **Employees** | Auto employee IDs, job/salary/bank/emergency details, employment type & status, linked login provisioning |
| **Attendance** | Self check-in/out, late & half-day detection, manual marking, regularization workflow, monthly summary |
| **Leaves** | Leave types, balances, apply → manager approval → HR final approval, balance deduction, calendar |
| **Payroll** | Salary structure, monthly payroll runs, LOP calculation, payslips, **PDF download**, draft/processed/paid status |
| **Master Data** | Departments, designations, branches, shifts, holidays, leave types |
| **Announcements** | Company-wide / department notices with unread badge |
| **Documents** | Per-employee uploads (offer letter, ID proof, etc.) with secure download |
| **Reports** | Employee / attendance / leave / payroll / department reports with **CSV export** |
| **Dashboards** | Role-specific dashboards (Super Admin, HR, Manager, Employee) with Recharts |

## 🧱 Tech Stack

**Backend:** Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, Multer, Nodemailer, PDFKit, Zod, Helmet, Winston, express-rate-limit.

**Frontend:** React 18, Vite, React Router, Zustand, Tailwind CSS, Axios, React Hook Form, Zod, Recharts, Framer Motion, react-hot-toast, lucide-react.

## 👥 Roles

`super_admin` · `hr` (Company Admin / HR) · `manager` · `employee`

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas URI

### 1. Backend

```bash
cd backend
cp .env.example .env          # Windows: copy .env.example .env
# edit .env if needed (JWT secrets, MONGO_URI)
npm install
npm run seed                  # creates demo company + 4 demo logins
npm run dev                   # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Open **http://localhost:5173** and use a demo login below.

---

## 🔑 Demo Logins

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `superadmin@hrms.com` | `Admin@123` |
| HR / Admin | `hr@jaishglobaltech.com` | `Hr@1234` |
| Manager | `manager@jaishglobaltech.com` | `Manager@123` |
| Employee | `employee@jaishglobaltech.com` | `Employee@123` |

> The login screen also has one-click "Quick demo login" buttons.

---

## 📁 Project Structure

```
HRMS/
├── backend/
│   └── src/
│       ├── config/        # env, db, roles
│       ├── controllers/   # request handlers (MVC)
│       ├── models/        # 17 Mongoose models
│       ├── routes/        # REST routes (mounted at /api/v1)
│       ├── middleware/    # auth, rbac, validate, error, upload
│       ├── services/      # email, payroll, pdf, audit, date
│       ├── utils/         # ApiError, ApiResponse, tokens, crudFactory…
│       ├── validations/   # Zod schemas
│       ├── seed/          # seed.js (demo data)
│       ├── app.js         # express app
│       └── server.js      # bootstrap
└── frontend/
    └── src/
        ├── api/           # axios client + endpoint wrappers
        ├── store/         # Zustand stores (auth, theme)
        ├── components/    # reusable UI
        ├── layouts/       # dashboard shell
        ├── pages/         # feature + auth pages
        ├── routes/        # ProtectedRoute
        ├── hooks/         # useList
        └── utils/         # constants, formatters
```

## 🔌 API Overview

Base URL: `http://localhost:5000/api/v1`

| Resource | Routes |
| --- | --- |
| Auth | `POST /auth/register-company`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `GET /auth/me` |
| Companies | `GET/PUT /companies/me`, `GET /companies`, `PATCH /companies/:id/active` |
| Employees | `GET/POST /employees`, `GET/PUT/DELETE /employees/:id`, `PATCH /employees/:id/status` |
| Attendance | `POST /attendance/check-in`, `/check-out`, `/mark`, `GET /attendance`, `/attendance/monthly` |
| Leaves | `GET/POST /leaves`, `PATCH /leaves/:id/manager`, `/leaves/:id/hr`, `/leaves/:id/cancel`, `GET /leaves/balance` |
| Payroll | `POST /payroll/generate`, `GET /payroll`, `GET /payroll/payslips`, `GET /payroll/payslips/:id/pdf` |
| Master | `/departments`, `/designations`, `/branches`, `/shifts`, `/holidays`, `/leave-types` (full CRUD) |
| Announcements | `GET/POST /announcements`, `PATCH /announcements/:id/read` |
| Documents | `GET/POST /documents`, `GET /documents/:id/download` |
| Reports | `GET /reports/{employees,attendance,leaves,payroll,departments}?format=csv` |
| Dashboard | `GET /dashboard` |
| Audit | `GET /audit-logs` |

A ready-to-import Postman collection is at [`postman_collection.json`](./postman_collection.json).

## 🔒 Business Rules Enforced
- One company → many employees; an employee belongs to one company.
- HR manages only their company; Managers only their direct reports; Employees only their own data; Super Admin sees all.
- Attendance is unique per employee per day (DB unique index).
- Leave balance is deducted on **final HR approval** and restored on cancellation.
- Payroll computes loss-of-pay from attendance; payslips are generated month-wise and snapshotted.

## 🛠️ Useful Scripts

**Backend:** `npm run dev` · `npm start` · `npm run seed` · `npm run seed:destroy`
**Frontend:** `npm run dev` · `npm run build` · `npm run preview`

## 📦 Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for production deployment (Render/Railway + Vercel/Netlify + MongoDB Atlas).

## 📄 License
MIT
