/**
 * Leave management: apply (employee), approve/reject (manager + HR), and view
 * leave balances.
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Check, X } from 'lucide-react';
import { leaveApi, masterApi } from '../api/endpoints';
import { errMsg } from '../api/client';
import { useList } from '../hooks/useList';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../utils/constants';
import { PageHeader, Loader, EmptyState, Pagination, Modal, Badge, Spinner } from '../components/ui';
import { fmtDate } from '../utils/format';

export default function Leaves() {
  const { user } = useAuthStore();
  const isHR = [ROLES.SUPER_ADMIN, ROLES.HR].includes(user.role);
  const isManager = user.role === ROLES.MANAGER;
  const { data, meta, loading, setParam, reload } = useList(leaveApi.list);
  const [balances, setBalances] = useState([]);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    if (user.employee) leaveApi.balance().then(({ data }) => setBalances(data.data)).catch(() => {});
  }, [user.employee]);

  const action = async (fn, msg) => {
    try {
      await fn();
      toast.success(msg);
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Leaves"
        subtitle="Apply for and manage leave requests"
        actions={user.employee && (
          <button className="btn-primary" onClick={() => setApplyOpen(true)}><Plus className="h-4 w-4" /> Apply Leave</button>
        )}
      />

      {balances.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {balances.map((b) => (
            <div key={b._id || b.leaveType?._id} className="card flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: b.leaveType?.color || '#6366f1' }} />
                <span className="text-sm">{b.leaveType?.name}</span>
              </div>
              <span className="text-lg font-bold">{b.balance}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card mb-4 flex gap-3">
        <select className="input sm:w-48" onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          {['pending', 'manager_approved', 'approved', 'rejected', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? <Loader /> : data.length === 0 ? (
          <EmptyState title="No leave requests" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr>
                  {user.role !== ROLES.EMPLOYEE && <th className="pb-3">Employee</th>}
                  <th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((l) => (
                  <tr key={l._id} className="border-t border-slate-100 dark:border-slate-800">
                    {user.role !== ROLES.EMPLOYEE && <td className="py-2">{l.employee?.firstName} {l.employee?.lastName}</td>}
                    <td>{l.leaveType?.name}</td>
                    <td>{fmtDate(l.startDate)}</td>
                    <td>{fmtDate(l.endDate)}</td>
                    <td>{l.days}</td>
                    <td><Badge status={l.status} /></td>
                    <td className="text-right">
                      {isManager && l.status === 'pending' && (
                        <ActionBtns
                          onApprove={() => action(() => leaveApi.managerAction(l._id, { decision: 'approved' }), 'Approved')}
                          onReject={() => action(() => leaveApi.managerAction(l._id, { decision: 'rejected' }), 'Rejected')}
                        />
                      )}
                      {isHR && ['pending', 'manager_approved'].includes(l.status) && (
                        <ActionBtns
                          onApprove={() => action(() => leaveApi.hrAction(l._id, { decision: 'approved' }), 'Approved')}
                          onReject={() => action(() => leaveApi.hrAction(l._id, { decision: 'rejected' }), 'Rejected')}
                        />
                      )}
                      {String(l.employee?._id || l.employee) === String(user.employee) && ['pending', 'manager_approved', 'approved'].includes(l.status) && (
                        <button className="text-xs text-red-500 hover:underline" onClick={() => action(() => leaveApi.cancel(l._id), 'Cancelled')}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={(p) => setParam('page', p)} />
      </div>

      {applyOpen && <ApplyForm onClose={() => setApplyOpen(false)} onSaved={() => { setApplyOpen(false); reload(); }} />}
    </div>
  );
}

function ActionBtns({ onApprove, onReject }) {
  return (
    <span className="inline-flex gap-1">
      <button className="rounded-md bg-green-50 p-1.5 text-green-600 hover:bg-green-100" onClick={onApprove}><Check className="h-4 w-4" /></button>
      <button className="rounded-md bg-red-50 p-1.5 text-red-600 hover:bg-red-100" onClick={onReject}><X className="h-4 w-4" /></button>
    </span>
  );
}

function ApplyForm({ onClose, onSaved }) {
  const [types, setTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    masterApi.list('leave-types', { limit: 100 }).then(({ data }) => setTypes(data.data));
  }, []);

  const onSubmit = async (v) => {
    setSaving(true);
    try {
      await leaveApi.apply(v);
      toast.success('Leave applied');
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Apply for Leave">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label">Leave type *</label>
          <select className="input" {...register('leaveType', { required: true })}>
            <option value="">Select...</option>
            {types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
          {errors.leaveType && <p className="text-xs text-red-500">Required</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">From *</label>
            <input type="date" className="input" {...register('startDate', { required: true })} />
          </div>
          <div>
            <label className="label">To *</label>
            <input type="date" className="input" {...register('endDate', { required: true })} />
          </div>
        </div>
        <div>
          <label className="label">Reason</label>
          <textarea rows={3} className="input" {...register('reason')} />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner className="h-4 w-4 text-white" /> : 'Submit'}</button>
        </div>
      </form>
    </Modal>
  );
}
