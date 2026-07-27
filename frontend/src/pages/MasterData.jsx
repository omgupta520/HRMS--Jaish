/**
 * Master data manager: tabbed CRUD for Departments, Designations, Branches,
 * Shifts, Holidays and Leave Types — all powered by the generic master API.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { masterApi } from '../api/endpoints';
import { errMsg } from '../api/client';
import { useList } from '../hooks/useList';
import { PageHeader, Loader, EmptyState, Modal, Spinner } from '../components/ui';

// Each tab declares its resource, columns and the fields shown in the create form.
const TABS = [
  { key: 'departments', label: 'Departments', fields: [{ name: 'name', label: 'Name', required: true }, { name: 'description', label: 'Description' }], columns: ['name', 'description'] },
  { key: 'designations', label: 'Designations', fields: [{ name: 'title', label: 'Title', required: true }, { name: 'level', label: 'Level', type: 'number' }], columns: ['title', 'level'] },
  { key: 'branches', label: 'Branches', fields: [{ name: 'name', label: 'Name', required: true }, { name: 'code', label: 'Code' }], columns: ['name', 'code'] },
  { key: 'shifts', label: 'Shifts', fields: [{ name: 'name', label: 'Name', required: true }, { name: 'startTime', label: 'Start (HH:mm)', required: true }, { name: 'endTime', label: 'End (HH:mm)', required: true }], columns: ['name', 'startTime', 'endTime'] },
  { key: 'holidays', label: 'Holidays', fields: [{ name: 'name', label: 'Name', required: true }, { name: 'date', label: 'Date', type: 'date', required: true }], columns: ['name', 'date'] },
  { key: 'leave-types', label: 'Leave Types', fields: [{ name: 'name', label: 'Name', required: true }, { name: 'annualQuota', label: 'Annual Quota', type: 'number' }], columns: ['name', 'annualQuota'] },
];

export default function MasterData() {
  const [tab, setTab] = useState(TABS[0]);
  return (
    <div>
      <PageHeader title="Master Data" subtitle="Configure organisation structure & policies" />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab.key === t.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <ResourcePanel key={tab.key} tab={tab} />
    </div>
  );
}

function ResourcePanel({ tab }) {
  const fetcher = (params) => masterApi.list(tab.key, params);
  const { data, loading, reload } = useList(fetcher);
  const [open, setOpen] = useState(false);

  const remove = async (id) => {
    try {
      await masterApi.remove(tab.key, id);
      toast.success('Deleted');
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">{tab.label}</h3>
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add</button>
      </div>
      {loading ? <Loader /> : data.length === 0 ? <EmptyState title={`No ${tab.label.toLowerCase()} yet`} /> : (
        <table className="w-full text-sm">
          <thead className="text-left text-slate-400">
            <tr>{tab.columns.map((c) => <th key={c} className="pb-2 capitalize">{c}</th>)}<th className="text-right">Action</th></tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row._id} className="border-t border-slate-100 dark:border-slate-800">
                {tab.columns.map((c) => <td key={c} className="py-2">{c === 'date' && row[c] ? new Date(row[c]).toLocaleDateString() : (row[c] ?? '—')}</td>)}
                <td className="text-right"><button className="rounded-md p-1.5 text-red-400 hover:bg-red-50" onClick={() => remove(row._id)}><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && <ResourceForm tab={tab} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); reload(); }} />}
    </div>
  );
}

function ResourceForm({ tab, onClose, onSaved }) {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [saving, setSaving] = useState(false);

  const onSubmit = async (v) => {
    setSaving(true);
    try {
      await masterApi.create(tab.key, v);
      toast.success('Created');
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Add ${tab.label.replace(/s$/, '')}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {tab.fields.map((f) => (
          <div key={f.name}>
            <label className="label">{f.label}{f.required && ' *'}</label>
            <input type={f.type || 'text'} className="input" {...register(f.name, { required: f.required })} />
            {errors[f.name] && <p className="text-xs text-red-500">Required</p>}
          </div>
        ))}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? <Spinner className="h-4 w-4 text-white" /> : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
