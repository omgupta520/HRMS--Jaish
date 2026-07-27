/**
 * Announcements feed. HR can publish; everyone reads. Opening the page marks
 * unread announcements as read.
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Megaphone, Trash2 } from 'lucide-react';
import { announcementApi, masterApi } from '../api/endpoints';
import { errMsg } from '../api/client';
import { useList } from '../hooks/useList';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../utils/constants';
import { PageHeader, Loader, EmptyState, Pagination, Modal, Badge, Spinner } from '../components/ui';
import { fmtDate } from '../utils/format';

export default function Announcements() {
  const { user } = useAuthStore();
  const isHR = [ROLES.SUPER_ADMIN, ROLES.HR].includes(user.role);
  const { data, meta, loading, setParam, reload } = useList(announcementApi.list);
  const [open, setOpen] = useState(false);

  // Mark all visible announcements as read on view.
  useEffect(() => {
    data.filter((a) => !a.isRead).forEach((a) => announcementApi.markRead(a._id).catch(() => {}));
  }, [data]);

  const remove = async (id) => {
    try {
      await announcementApi.remove(id);
      toast.success('Deleted');
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Company-wide and department notices"
        actions={isHR && <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New</button>}
      />

      {loading ? <Loader /> : data.length === 0 ? <EmptyState title="No announcements" /> : (
        <div className="space-y-3">
          {data.map((a) => (
            <div key={a._id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-brand-50 p-2 text-brand-600"><Megaphone className="h-5 w-5" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{a.title}</h3>
                      {a.priority !== 'normal' && <Badge status={a.priority === 'urgent' ? 'rejected' : 'pending'}>{a.priority}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{a.body}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {a.audience === 'department' ? `Dept: ${a.department?.name || '—'}` : 'Company-wide'} · {fmtDate(a.createdAt)} · by {a.createdBy?.name}
                    </p>
                  </div>
                </div>
                {isHR && <button className="rounded-md p-1.5 text-red-400 hover:bg-red-50" onClick={() => remove(a._id)}><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination meta={meta} onPage={(p) => setParam('page', p)} />

      {open && <Composer onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
    </div>
  );
}

function Composer({ onClose, onSaved }) {
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { audience: 'company', priority: 'normal' } });
  const audience = watch('audience');

  useEffect(() => {
    masterApi.list('departments', { limit: 100 }).then(({ data }) => setDepartments(data.data));
  }, []);

  const onSubmit = async (v) => {
    setSaving(true);
    try {
      await announcementApi.create({ ...v, department: v.audience === 'department' ? v.department : undefined });
      toast.success('Published');
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="New Announcement">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Title *</label>
          <input className="input" {...register('title', { required: true })} />
          {errors.title && <p className="text-xs text-red-500">Required</p>}
        </div>
        <div>
          <label className="label">Message *</label>
          <textarea rows={4} className="input" {...register('body', { required: true })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Audience</label>
            <select className="input" {...register('audience')}>
              <option value="company">Company-wide</option>
              <option value="department">Department</option>
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" {...register('priority')}>
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
        {audience === 'department' && (
          <div>
            <label className="label">Department</label>
            <select className="input" {...register('department')}>
              <option value="">Select...</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner className="h-4 w-4 text-white" /> : 'Publish'}</button>
        </div>
      </form>
    </Modal>
  );
}
