/**
 * Reports: pick a report type, preview the data and export to CSV.
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Download } from 'lucide-react';
import { reportApi } from '../api/endpoints';
import { tokenStore, errMsg } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../utils/constants';
import { PageHeader, Loader, EmptyState } from '../components/ui';

const TYPES = [
  { key: 'employees', label: 'Employees' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'leaves', label: 'Leaves' },
  { key: 'payroll', label: 'Payroll', hr: true },
  { key: 'departments', label: 'Departments' },
];

export default function Reports() {
  const { user } = useAuthStore();
  const types = TYPES.filter((t) => !t.hr || [ROLES.SUPER_ADMIN, ROLES.HR].includes(user.role));
  const [type, setType] = useState(types[0].key);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    reportApi.get(type)
      .then(({ data }) => setRows(data.data || []))
      .catch((err) => toast.error(errMsg(err)))
      .finally(() => setLoading(false));
  }, [type]);

  const exportCsv = () => {
    fetch(`/api/v1/reports/${type}?format=csv`, { headers: { Authorization: `Bearer ${tokenStore.access}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-report.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Export failed'));
  };

  const columns = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Preview and export organisation data"
        actions={rows.length > 0 && <button className="btn-primary" onClick={exportCsv}><Download className="h-4 w-4" /> Export CSV</button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {types.map((t) => (
          <button key={t.key} onClick={() => setType(t.key)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${type === t.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        {loading ? <Loader /> : rows.length === 0 ? <EmptyState title="No data for this report" /> : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr>{columns.map((c) => <th key={c} className="pb-2 capitalize">{c.replace(/([A-Z])/g, ' $1')}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                  {columns.map((c) => <td key={c} className="py-2">{String(row[c])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
