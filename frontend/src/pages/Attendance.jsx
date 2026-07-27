/**
 * Attendance: self check-in/out card + filterable attendance log. HR/Managers
 * can mark attendance manually.
 */
import { useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { LogIn, LogOut, Clock } from 'lucide-react';
import { attendanceApi } from '../api/endpoints';
import { errMsg } from '../api/client';
import { useList } from '../hooks/useList';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../utils/constants';
import { PageHeader, Loader, EmptyState, Pagination, Badge } from '../components/ui';
import { fmtDate, fmtTime } from '../utils/format';

export default function Attendance() {
  const { user } = useAuthStore();
  const isEmployee = ![ROLES.SUPER_ADMIN].includes(user.role);
  const { data, meta, loading, setParam, reload } = useList(attendanceApi.list);
  const [busy, setBusy] = useState(false);

  const act = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Track daily attendance and work hours" />

      {user.employee && (
        <div className="card mb-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-50 p-3 text-brand-600"><Clock className="h-6 w-6" /></div>
            <div>
              <p className="text-sm text-slate-500">{dayjs().format('dddd, DD MMMM YYYY')}</p>
              <p className="font-semibold">Mark your attendance for today</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy} onClick={() => act(() => attendanceApi.checkIn(), 'Checked in')}>
              <LogIn className="h-4 w-4" /> Check In
            </button>
            <button className="btn-secondary" disabled={busy} onClick={() => act(() => attendanceApi.checkOut(), 'Checked out')}>
              <LogOut className="h-4 w-4" /> Check Out
            </button>
          </div>
        </div>
      )}

      <div className="card mb-4 flex flex-col gap-3 sm:flex-row">
        <input type="date" className="input sm:w-44" onChange={(e) => setParam('from', e.target.value)} />
        <input type="date" className="input sm:w-44" onChange={(e) => setParam('to', e.target.value)} />
        <select className="input sm:w-40" onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          {['present', 'absent', 'half_day', 'on_leave', 'wfh'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? <Loader /> : data.length === 0 ? (
          <EmptyState title="No attendance records" subtitle="Records will appear once attendance is marked." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr>
                  {!isEmployee || user.role !== ROLES.EMPLOYEE ? <th className="pb-3">Employee</th> : null}
                  <th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a._id} className="border-t border-slate-100 dark:border-slate-800">
                    {user.role !== ROLES.EMPLOYEE && <td className="py-2">{a.employee?.firstName} {a.employee?.lastName}</td>}
                    <td>{fmtDate(a.date)}</td>
                    <td>{fmtTime(a.checkIn)} {a.isLate && <span className="text-xs text-amber-500">(late)</span>}</td>
                    <td>{fmtTime(a.checkOut)}</td>
                    <td>{a.workedHours || 0}h</td>
                    <td><Badge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={(p) => setParam('page', p)} />
      </div>
    </div>
  );
}
