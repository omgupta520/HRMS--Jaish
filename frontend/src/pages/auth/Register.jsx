import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { errMsg } from '../../api/client';
import { Spinner } from '../../components/ui';
import AuthShell from './AuthShell';

const schema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  adminName: z.string().min(2, 'Your name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Minimum 6 characters'),
  phone: z.string().optional(),
});

export default function Register() {
  const registerCompany = useAuthStore((s) => s.registerCompany);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      await registerCompany(values);
      toast.success('Company created! Welcome to HRMS.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Register your company" subtitle="Create your company workspace and admin account">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Company name</label>
          <input className="input" placeholder="Acme Corporation" {...register('companyName')} />
          {errors.companyName && <p className="mt-1 text-xs text-red-500">{errors.companyName.message}</p>}
        </div>
        <div>
          <label className="label">Your name (admin)</label>
          <input className="input" placeholder="Jane Doe" {...register('adminName')} />
          {errors.adminName && <p className="mt-1 text-xs text-red-500">{errors.adminName.message}</p>}
        </div>
        <div>
          <label className="label">Work email</label>
          <input className="input" placeholder="admin@acme.com" {...register('email')} />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input className="input" placeholder="+1 555 0100" {...register('phone')} />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner className="h-4 w-4 text-white" /> : 'Create company'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
