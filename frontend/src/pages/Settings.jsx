/**
 * Company settings — profile + attendance/payroll policy configuration.
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { companyApi } from '../api/endpoints';
import { errMsg } from '../api/client';
import { PageHeader, Loader, Spinner } from '../components/ui';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    companyApi.me().then(({ data }) => {
      const c = data.data;
      reset({
        name: c.name, email: c.email, phone: c.phone, website: c.website,
        'settings.currency': c.settings?.currency,
        'settings.lateMarkAfter': c.settings?.lateMarkAfter,
        'settings.fullDayHours': c.settings?.fullDayHours,
        'settings.halfDayHours': c.settings?.halfDayHours,
      });
    }).finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (v) => {
    setSaving(true);
    const payload = {
      name: v.name, email: v.email, phone: v.phone, website: v.website,
      settings: {
        currency: v['settings.currency'],
        lateMarkAfter: v['settings.lateMarkAfter'],
        fullDayHours: Number(v['settings.fullDayHours']),
        halfDayHours: Number(v['settings.halfDayHours']),
      },
    };
    try {
      await companyApi.update(payload);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage company profile and policies" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card">
          <h3 className="mb-4 font-semibold">Company Profile</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Company name</label><input className="input" {...register('name')} /></div>
            <div><label className="label">Email</label><input className="input" {...register('email')} /></div>
            <div><label className="label">Phone</label><input className="input" {...register('phone')} /></div>
            <div><label className="label">Website</label><input className="input" {...register('website')} /></div>
          </div>
        </div>
        <div className="card">
          <h3 className="mb-4 font-semibold">Attendance & Payroll</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className="label">Currency</label><input className="input" {...register('settings.currency')} /></div>
            <div><label className="label">Late mark after</label><input className="input" placeholder="09:30" {...register('settings.lateMarkAfter')} /></div>
            <div><label className="label">Full day hours</label><input type="number" className="input" {...register('settings.fullDayHours')} /></div>
            <div><label className="label">Half day hours</label><input type="number" className="input" {...register('settings.halfDayHours')} /></div>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner className="h-4 w-4 text-white" /> : 'Save settings'}</button>
        </div>
      </form>
    </div>
  );
}
