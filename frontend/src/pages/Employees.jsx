/**
 * Employee directory with search/filter, create/edit modal and status actions.
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { employeeApi, masterApi } from '../api/endpoints';
import { errMsg } from '../api/client';
import { useList } from '../hooks/useList';
import { useAuthStore } from '../store/authStore';
import { ROLES, EMPLOYMENT_TYPES, EMPLOYEE_STATUS } from '../utils/constants';
import {
  PageHeader, Loader, EmptyState, Pagination, Modal, ConfirmModal, Badge, Spinner,
} from '../components/ui';
import { fmtDate, initials, titleCase } from '../utils/format';

export default function Employees() {
  const { user } = useAuthStore();
  const canManage = [ROLES.SUPER_ADMIN, ROLES.HR].includes(user.role);
  const { data, meta, loading, params, setParam, reload } = useList(employeeApi.list);
  const [modal, setModal] = useState({ open: false, employee: null });
  const [confirm, setConfirm] = useState({ open: false, id: null, loading: false });

  const handleDelete = async () => {
    setConfirm((c) => ({ ...c, loading: true }));
    try {
      await employeeApi.remove(confirm.id);
      toast.success('Employee deleted');
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setConfirm({ open: false, id: null, loading: false });
    }
  };

  const changeStatus = async (id, status) => {
    try {
      await employeeApi.changeStatus(id, status);
      toast.success('Status updated');
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div>
      <PageHeader
        title="Employees"
        subtitle="Manage your organisation's people"
        actions={canManage && (
          <button className="btn-primary" onClick={() => setModal({ open: true, employee: null })}>
            <Plus className="h-4 w-4" /> Add Employee
          </button>
        )}
      />

      <div className="card mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, email or ID..." onChange={(e) => setParam('search', e.target.value)} />
        </div>
        <select className="input sm:w-44" onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          {EMPLOYEE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="card">
        {loading ? (
          <Loader />
        ) : data.length === 0 ? (
          <EmptyState title="No employees found" subtitle="Add your first employee to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400">
                <tr>
                  <th className="pb-3">Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Status</th>
                  {canManage && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((e) => (
                  <tr key={e._id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                          {initials(`${e.firstName} ${e.lastName || ''}`)}
                        </span>
                        <div>
                          <p className="font-medium text-slate-700 dark:text-slate-200">{e.firstName} {e.lastName}</p>
                          <p className="text-xs text-slate-400">{e.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-slate-500">{e.employeeId}</td>
                    <td className="text-slate-500">{e.department?.name || '—'}</td>
                    <td className="text-slate-500">{titleCase(e.employmentType)}</td>
                    <td>
                      {canManage ? (
                        <select value={e.status} onChange={(ev) => changeStatus(e._id, ev.target.value)} className="rounded-md border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700">
                          {EMPLOYEE_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      ) : <Badge status={e.status} />}
                    </td>
                    {canManage && (
                      <td className="text-right">
                        <button className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setModal({ open: true, employee: e })}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button className="rounded-md p-1.5 text-red-400 hover:bg-red-50" onClick={() => setConfirm({ open: true, id: e._id, loading: false })}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={(p) => setParam('page', p)} />
      </div>

      {modal.open && (
        <EmployeeForm
          employee={modal.employee}
          onClose={() => setModal({ open: false, employee: null })}
          onSaved={() => { setModal({ open: false, employee: null }); reload(); }}
        />
      )}

      <ConfirmModal
        open={confirm.open}
        loading={confirm.loading}
        onClose={() => setConfirm({ open: false, id: null, loading: false })}
        onConfirm={handleDelete}
        title="Delete employee"
        message="This permanently removes the employee and their login. This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}

function EmployeeForm({ employee, onClose, onSaved }) {
  const editing = !!employee;
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: editing
      ? {
          firstName: employee.firstName, lastName: employee.lastName, email: employee.email,
          phone: employee.phone, employmentType: employee.employmentType,
          department: employee.department?._id, designation: employee.designation?._id,
          'salary.basic': employee.salary?.basic, 'salary.hra': employee.salary?.hra,
          'salary.allowances': employee.salary?.allowances,
        }
      : { employmentType: 'full_time' },
  });

  useEffect(() => {
    masterApi.list('departments', { limit: 100 }).then(({ data }) => setDepartments(data.data));
    masterApi.list('designations', { limit: 100 }).then(({ data }) => setDesignations(data.data));
  }, []);

  const onSubmit = async (v) => {
    setSaving(true);
    const payload = {
      firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone,
      employmentType: v.employmentType, department: v.department || undefined, designation: v.designation || undefined,
      salary: { basic: Number(v['salary.basic'] || 0), hra: Number(v['salary.hra'] || 0), allowances: Number(v['salary.allowances'] || 0) },
    };
    try {
      if (editing) {
        await employeeApi.update(employee._id, payload);
        toast.success('Employee updated');
      } else {
        await employeeApi.create(payload);
        toast.success('Employee created — login credentials emailed');
      }
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={editing ? 'Edit Employee' : 'Add Employee'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First name *</label>
            <input className="input" {...register('firstName', { required: true })} />
            {errors.firstName && <p className="text-xs text-red-500">Required</p>}
          </div>
          <div>
            <label className="label">Last name</label>
            <input className="input" {...register('lastName')} />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" disabled={editing} {...register('email', { required: true })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" {...register('phone')} />
          </div>
          <div>
            <label className="label">Department</label>
            <select className="input" {...register('department')}>
              <option value="">—</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Designation</label>
            <select className="input" {...register('designation')}>
              <option value="">—</option>
              {designations.map((d) => <option key={d._id} value={d._id}>{d.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Employment type</label>
            <select className="input" {...register('employmentType')}>
              {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
          <div><label className="label">Basic</label><input type="number" className="input" {...register('salary.basic')} /></div>
          <div><label className="label">HRA</label><input type="number" className="input" {...register('salary.hra')} /></div>
          <div><label className="label">Allowances</label><input type="number" className="input" {...register('salary.allowances')} /></div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? <Spinner className="h-4 w-4 text-white" /> : editing ? 'Save changes' : 'Create employee'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
