import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { errMsg } from '../../api/client';
import { Spinner } from '../../components/ui';
import AuthShell from './AuthShell';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// Demo accounts created by the seed script.
const DEMO = [
  { role: 'Super Admin', email: 'superadmin@hrms.com', password: 'Admin@123' },
  { role: 'HR / Admin', email: 'hr@jaishglobaltech.com', password: 'Hr@1234' },
  { role: 'Manager', email: 'manager@jaishglobaltech.com', password: 'Manager@123' },
  { role: 'Employee', email: 'employee@jaishglobaltech.com', password: 'Employee@123' },
];

export default function Login() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await login(values);
      toast.success('Welcome back!');
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  const useDemo = (d) => {
    setValue('email', d.email);
    setValue('password', d.password);
  };

  return (
    <AuthShell title="Sign in to your account" subtitle="Enter your credentials to continue">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" placeholder="you@company.com" {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label">Password</label>
            <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline">Forgot password?</Link>
          </div>
          <input type="password" className="input" placeholder="••••••••" {...register('password')} />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4 text-white" /> : 'Sign in'}
        </button>
      </form>

      <div className="mt-6">
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-slate-400">Quick demo logins</p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO.map((d) => (
            <button key={d.email} onClick={() => useDemo(d)} className="btn-secondary text-xs">
              {d.role}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        New company?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">Register here</Link>
      </p>
    </AuthShell>
  );
}
