/**
 * Super Admin: list all tenant companies and suspend/activate them.
 */
import toast from 'react-hot-toast';
import { Building2, Search } from 'lucide-react';
import { companyApi } from '../api/endpoints';
import { errMsg } from '../api/client';
import { useList } from '../hooks/useList';
import { PageHeader, Loader, EmptyState, Pagination, Badge } from '../components/ui';
import { fmtDate } from '../utils/format';

export default function Companies() {
  const { data, meta, loading, setParam, reload } = useList(companyApi.list);

  const toggle = async (c) => {
    try {
      await companyApi.toggleActive(c._id, !c.isActive);
      toast.success(c.isActive ? 'Company suspended' : 'Company activated');
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div>
      <PageHeader title="Companies" subtitle="All tenant companies on the platform" />
      <div className="card mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search companies..." onChange={(e) => setParam('search', e.target.value)} />
        </div>
      </div>
      <div className="card">
        {loading ? <Loader /> : data.length === 0 ? <EmptyState title="No companies" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr><th className="pb-3">Company</th><th>Code</th><th>Employees</th><th>Created</th><th>Status</th><th className="text-right">Action</th></tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c._id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600"><Building2 className="h-5 w-5" /></span>
                        <div><p className="font-medium">{c.name}</p><p className="text-xs text-slate-400">{c.email}</p></div>
                      </div>
                    </td>
                    <td>{c.code}</td>
                    <td>{c.employeeCount}</td>
                    <td>{fmtDate(c.createdAt)}</td>
                    <td><Badge status={c.isActive ? 'active' : 'cancelled'}>{c.isActive ? 'Active' : 'Suspended'}</Badge></td>
                    <td className="text-right">
                      <button className={c.isActive ? 'text-xs text-red-500 hover:underline' : 'text-xs text-green-600 hover:underline'} onClick={() => toggle(c)}>
                        {c.isActive ? 'Suspend' : 'Activate'}
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
    </div>
  );
}
