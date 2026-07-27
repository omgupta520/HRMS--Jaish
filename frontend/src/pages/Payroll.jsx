/**
 * Payroll: HR generates monthly runs and advances status; everyone can view and
 * download their own payslips as PDF.
 */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, Play } from 'lucide-react';
import { payrollApi } from '../api/endpoints';
import { tokenStore } from '../api/client';
import { errMsg } from '../api/client';
import { useList } from '../hooks/useList';
import { useAuthStore } from '../store/authStore';
import { ROLES, MONTHS } from '../utils/constants';
import { PageHeader, Loader, EmptyState, Pagination, Badge, Spinner } from '../components/ui';
import { fmtMoney } from '../utils/format';
import dayjs from 'dayjs';

export default function Payroll() {
  const { user } = useAuthStore();
  const isHR = [ROLES.SUPER_ADMIN, ROLES.HR].includes(user.role);
  return (
    <div>
      <PageHeader title="Payroll" subtitle="Generate runs and manage payslips" />
      {isHR && <Runs />}
      <Payslips />
    </div>
  );
}

function Runs() {
  const now = dayjs();
  const [month, setMonth] = useState(now.month() + 1);
  const [year, setYear] = useState(now.year());
  const [busy, setBusy] = useState(false);
  const { data, meta, loading, setParam, reload } = useList(payrollApi.runs);

  const generate = async () => {
    setBusy(true);
    try {
      await payrollApi.generate({ month, year });
      toast.success('Payroll generated');
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const advance = async (id, status) => {
    try {
      await payrollApi.updateStatus(id, status);
      toast.success(`Marked ${status}`);
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="card mb-6">
      <h3 className="mb-4 font-semibold">Payroll Runs</h3>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Month</label>
          <select className="input w-40" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Year</label>
          <input type="number" className="input w-28" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <button className="btn-primary" disabled={busy} onClick={generate}>
          {busy ? <Spinner className="h-4 w-4 text-white" /> : <><Play className="h-4 w-4" /> Generate</>}
        </button>
      </div>

      {loading ? <Loader /> : data.length === 0 ? <EmptyState title="No payroll runs yet" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr><th className="pb-3">Period</th><th>Employees</th><th>Gross</th><th>Net</th><th>Status</th><th className="text-right">Action</th></tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2">{MONTHS[r.month - 1]} {r.year}</td>
                  <td>{r.totalEmployees}</td>
                  <td>{fmtMoney(r.totalGross)}</td>
                  <td>{fmtMoney(r.totalNet)}</td>
                  <td><Badge status={r.status} /></td>
                  <td className="text-right">
                    {r.status === 'draft' && <button className="text-xs text-brand-600 hover:underline" onClick={() => advance(r._id, 'processed')}>Process</button>}
                    {r.status === 'processed' && <button className="text-xs text-green-600 hover:underline" onClick={() => advance(r._id, 'paid')}>Mark Paid</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={meta} onPage={(p) => setParam('page', p)} />
    </div>
  );
}

function Payslips() {
  const { data, meta, loading, setParam } = useList(payrollApi.payslips);

  const download = (id) => {
    // Open PDF with the access token via a temporary anchor (fetch + blob).
    fetch(payrollApi.payslipPdfUrl(id), { headers: { Authorization: `Bearer ${tokenStore.access}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payslip-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Failed to download payslip'));
  };

  return (
    <div className="card">
      <h3 className="mb-4 font-semibold">Payslips</h3>
      {loading ? <Loader /> : data.length === 0 ? <EmptyState title="No payslips available" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr><th className="pb-3">Employee</th><th>Period</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Status</th><th className="text-right">PDF</th></tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2">{p.employee?.firstName} {p.employee?.lastName}</td>
                  <td>{MONTHS[p.month - 1]?.slice(0, 3)} {p.year}</td>
                  <td>{fmtMoney(p.grossEarnings)}</td>
                  <td>{fmtMoney(p.totalDeductions)}</td>
                  <td className="font-semibold">{fmtMoney(p.netPay)}</td>
                  <td><Badge status={p.status} /></td>
                  <td className="text-right">
                    <button className="rounded-md p-1.5 text-brand-600 hover:bg-brand-50" onClick={() => download(p._id)}>
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination meta={meta} onPage={(p) => setParam('page', p)} />
    </div>
  );
}
