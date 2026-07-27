/**
 * Split-screen wrapper for the auth pages: marketing panel + form card.
 */
import { ShieldCheck, Users, CalendarCheck, Wallet } from 'lucide-react';

const features = [
  { icon: Users, text: 'Employee & department management' },
  { icon: CalendarCheck, text: 'Attendance & leave workflows' },
  { icon: Wallet, text: 'Payroll & payslip generation' },
  { icon: ShieldCheck, text: 'Role-based access & audit logs' },
];

export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-800 p-12 text-white lg:flex">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/20 text-xl font-bold">H</div>
          <span className="text-2xl font-bold">HRMS</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight">Everything your HR team needs, in one place.</h2>
          <p className="mt-3 max-w-md text-brand-100">A modern, multi-tenant HR platform built for growing companies.</p>
          <ul className="mt-8 space-y-4">
            {features.map((f) => (
              <li key={f.text} className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/15">
                  <f.icon className="h-5 w-5" />
                </span>
                <span className="text-brand-50">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-brand-200">© {new Date().getFullYear()} HRMS Platform</p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 font-bold text-white">H</div>
            <span className="text-xl font-bold">HRMS</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
