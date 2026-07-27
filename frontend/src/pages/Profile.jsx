/**
 * Current user's profile + change-password form.
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '../api/endpoints';
import { errMsg } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { ROLE_LABELS } from '../utils/constants';
import { PageHeader, Loader, Spinner } from '../components/ui';
import { initials, fmtDate } from '../utils/format';

export default function Profile() {
  const { user } = useAuthStore();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    authApi.me().then(({ data }) => setEmployee(data.data.employee)).finally(() => setLoading(false));
  }, []);

  const onChangePassword = async (v) => {
    setSaving(true);
    try {
      await authApi.changePassword(v);
      toast.success('Password updated');
      reset();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader title="My Profile" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-1">
          <div className="flex flex-col items-center text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-600 text-2xl font-bold text-white">{initials(user.name)}</span>
            <h3 className="mt-3 text-lg font-semibold">{user.name}</h3>
            <p className="text-sm text-slate-500">{user.email}</p>
            <span className="badge mt-2 bg-brand-50 text-brand-600">{ROLE_LABELS[user.role]}</span>
          </div>
          {employee && (
            <dl className="mt-6 space-y-2 text-sm">
              <Row label="Employee ID" value={employee.employeeId} />
              <Row label="Department" value={employee.department?.name} />
              <Row label="Designation" value={employee.designation?.title} />
              <Row label="Joined" value={fmtDate(employee.joiningDate)} />
            </dl>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h3 className="mb-4 font-semibold">Change Password</h3>
          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
            <div>
              <label className="label">Current password</label>
              <input type="password" className="input" {...register('currentPassword', { required: true })} />
            </div>
            <div>
              <label className="label">New password</label>
              <input type="password" className="input" {...register('newPassword', { required: true })} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner className="h-4 w-4 text-white" /> : 'Update password'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-1 dark:border-slate-800">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </div>
  );
}
