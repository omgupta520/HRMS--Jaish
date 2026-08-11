/**
 * Employee directory — list, search/filter, add/edit (HR only), delete.
 * The "Add Employee" and management actions are restricted to the HR role.
 */
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Search, Pencil, Trash2, User } from 'lucide-react';
import { employeeApi, masterApi } from '../api/endpoints';
import { errMsg } from '../api/client';
import { useList } from '../hooks/useList';
import { useAuthStore } from '../store/authStore';
import { ROLES, EMPLOYMENT_TYPES, EMPLOYEE_STATUS } from '../utils/constants';
import {
  PageHeader, Loader, EmptyState, Pagination, Modal, ConfirmModal, Badge, Spinner,
} from '../components/ui';
import { fmtDate, initials, titleCase } from '../utils/format';

// Only HR (and Super Admin) can manage employees
const canManageRole = (role) => [ROLES.SUPER_ADMIN, ROLES.HR].includes(role);

/* ─── Main page ─────────────────────────────────────────────────────────── */
export default function Employees() {
  const { user } = useAuthStore();
  const canManage = canManageRole(user.role);
  const { data, meta, loading, params, setParam, reload } = useList(employeeApi.list);
  const [modal, setModal] = useState({ open: false, employee: null });
  const [confirm, setConfirm] = useState({ open: false, id: null, loading: false });

  const openAdd = () => setModal({ open: true, employee: null });
  const openEdit = (emp) => setModal({ open: true, employee: emp });
  const closeModal = () => setModal({ open: false, employee: null });

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
        subtitle={canManage ? 'Manage your organisation\'s people (HR only)' : 'Your organisation\'s people'}
        actions={canManage && (
          <button className="btn-primary flex items-center gap-2" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Employee
          </button>
        )}
      />

      {/* Filters */}
      <div className="card mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name, email or ID…"
            onChange={(e) => setParam('search', e.target.value)}
          />
        </div>
        <select className="input sm:w-44" onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          {EMPLOYEE_STATUS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <Loader />
        ) : data.length === 0 ? (
          <EmptyState
            title="No employees found"
            subtitle={canManage ? 'Click "Add Employee" to onboard your first team member.' : 'No employees to display.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-400 dark:text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">Employee</th>
                  <th className="pb-3 font-medium">ID</th>
                  <th className="pb-3 font-medium">Department</th>
                  <th className="pb-3 font-medium">Designation</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Status</th>
                  {canManage && <th className="pb-3 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((e) => (
                  <tr key={e._id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                          {initials(`${e.firstName} ${e.lastName || ''}`)}
                        </span>
                        <div>
                          <p className="font-medium text-slate-700 dark:text-slate-200">
                            {e.firstName} {e.lastName}
                          </p>
                          <p className="text-xs text-slate-400">{e.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-slate-500 dark:text-slate-400">{e.employeeId}</td>
                    <td className="text-slate-500 dark:text-slate-400">{e.department?.name || '—'}</td>
                    <td className="text-slate-500 dark:text-slate-400">{e.designation?.title || '—'}</td>
                    <td className="text-slate-500 dark:text-slate-400">{titleCase(e.employmentType)}</td>
                    <td>
                      {canManage ? (
                        <select
                          value={e.status}
                          onChange={(ev) => changeStatus(e._id, ev.target.value)}
                          className="rounded-md border border-slate-200 bg-transparent px-2 py-1 text-xs dark:border-slate-700"
                        >
                          {EMPLOYEE_STATUS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      ) : (
                        <Badge status={e.status} />
                      )}
                    </td>
                    {canManage && (
                      <td className="text-right">
                        <button
                          title="Edit employee"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => openEdit(e)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          title="Delete employee"
                          className="rounded-md p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => setConfirm({ open: true, id: e._id, loading: false })}
                        >
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
          onClose={closeModal}
          onSaved={() => { closeModal(); reload(); }}
        />
      )}

      <ConfirmModal
        open={confirm.open}
        loading={confirm.loading}
        onClose={() => setConfirm({ open: false, id: null, loading: false })}
        onConfirm={handleDelete}
        title="Delete employee"
        message="This permanently removes the employee and their login account. This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}

/* ─── Tab list ──────────────────────────────────────────────────────────── */
const TABS = ['Personal', 'Job Details', 'Salary', 'Bank & Emergency'];

/* ─── Add / Edit form modal ─────────────────────────────────────────────── */
function EmployeeForm({ employee, onClose, onSaved }) {
  const editing = !!employee;
  const [tab, setTab] = useState(0);
  const [saving, setSaving] = useState(false);

  // Master data for dropdowns
  const [departments, setDepartments]   = useState([]);
  const [designations, setDesignations] = useState([]);
  const [branches, setBranches]         = useState([]);
  const [shifts, setShifts]             = useState([]);
  const [managers, setManagers]         = useState([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    // ALL fields must have explicit defaults so React Hook Form registers
    // their values even when their tab is never visited by the user.
    defaultValues: editing
      ? {
          firstName:         employee.firstName        ?? '',
          lastName:          employee.lastName         ?? '',
          email:             employee.email            ?? '',
          phone:             employee.phone            ?? '',
          gender:            employee.gender           ?? '',
          dateOfBirth:       employee.dateOfBirth ? employee.dateOfBirth.slice(0, 10) : '',
          address:           employee.address          ?? '',
          department:        employee.department?._id  ?? '',
          designation:       employee.designation?._id ?? '',
          branch:            employee.branch?._id      ?? '',
          shift:             employee.shift?._id       ?? '',
          reportingManager:  employee.reportingManager?._id ?? employee.reportingManager ?? '',
          employmentType:    employee.employmentType   ?? 'full_time',
          role:              employee.user?.role       ?? 'employee',
          joiningDate:       employee.joiningDate ? employee.joiningDate.slice(0, 10) : '',
          basicSalary:       employee.salary?.basic        ?? 0,
          hra:               employee.salary?.hra           ?? 0,
          allowances:        employee.salary?.allowances    ?? 0,
          bonus:             employee.salary?.bonus         ?? 0,
          pf:                employee.salary?.pf            ?? 0,
          esi:               employee.salary?.esi           ?? 0,
          tds:               employee.salary?.tds           ?? 0,
          otherDeductions:   employee.salary?.otherDeductions ?? 0,
          bankAccountName:   employee.bank?.accountName   ?? '',
          bankAccountNumber: employee.bank?.accountNumber ?? '',
          bankName:          employee.bank?.bankName      ?? '',
          ifsc:              employee.bank?.ifsc          ?? '',
          pan:               employee.pan                 ?? '',
          emergencyName:     employee.emergencyContact?.name     ?? '',
          emergencyRelation: employee.emergencyContact?.relation ?? '',
          emergencyPhone:    employee.emergencyContact?.phone    ?? '',
        }
      : {
          // Explicit defaults for every field — ensures all values exist
          // in the form state even if the user never visits that tab.
          firstName: '', lastName: '', email: '', phone: '',
          gender: '', dateOfBirth: '', address: '',
          department: '', designation: '', branch: '', shift: '',
          reportingManager: '', employmentType: 'full_time', role: 'employee',
          joiningDate: new Date().toISOString().slice(0, 10),
          basicSalary: 0, hra: 0, allowances: 0, bonus: 0,
          pf: 0, esi: 0, tds: 0, otherDeductions: 0,
          bankAccountName: '', bankAccountNumber: '', bankName: '', ifsc: '',
          pan: '', emergencyName: '', emergencyRelation: '', emergencyPhone: '',
        },
  });

  useEffect(() => {
    Promise.all([
      masterApi.list('departments',  { limit: 100 }),
      masterApi.list('designations', { limit: 100 }),
      masterApi.list('branches',     { limit: 100 }),
      masterApi.list('shifts',       { limit: 100 }),
      employeeApi.list({ limit: 100, status: 'active' }),
    ]).then(([dep, des, br, sh, emp]) => {
      setDepartments(dep.data.data);
      setDesignations(des.data.data);
      setBranches(br.data.data);
      setShifts(sh.data.data);
      // Only managers and HR can be reporting managers
      setManagers(
        emp.data.data.filter((e) =>
          e._id !== employee?._id
        )
      );
    }).catch(() => {});
  }, []);

  // Helper — return value or undefined (drops empty strings / falsy so
  // MongoDB never receives an empty string as an ObjectId reference).
  const val = (v) => v || undefined;

  const onSubmit = async (v) => {
    setSaving(true);
    const payload = {
      firstName:        v.firstName,
      lastName:         val(v.lastName),
      email:            v.email,
      phone:            val(v.phone),
      gender:           val(v.gender),
      dateOfBirth:      val(v.dateOfBirth),
      address:          val(v.address),
      department:       val(v.department),      // ObjectId — must not be ''
      designation:      val(v.designation),     // ObjectId — must not be ''
      branch:           val(v.branch),          // ObjectId — must not be ''
      shift:            val(v.shift),           // ObjectId — must not be ''
      reportingManager: val(v.reportingManager),// ObjectId — must not be ''
      employmentType:   v.employmentType,
      role:             v.role,
      joiningDate:      val(v.joiningDate),
      salary: {
        basic:           Number(v.basicSalary    || 0),
        hra:             Number(v.hra            || 0),
        allowances:      Number(v.allowances     || 0),
        bonus:           Number(v.bonus          || 0),
        pf:              Number(v.pf             || 0),
        esi:             Number(v.esi            || 0),
        tds:             Number(v.tds            || 0),
        otherDeductions: Number(v.otherDeductions || 0),
      },
      bank: {
        accountName:   val(v.bankAccountName),
        accountNumber: val(v.bankAccountNumber),
        bankName:      val(v.bankName),
        ifsc:          val(v.ifsc),
      },
      pan: val(v.pan),
      emergencyContact: {
        name:     val(v.emergencyName),
        relation: val(v.emergencyRelation),
        phone:    val(v.emergencyPhone),
      },
    };

    try {
      if (editing) {
        await employeeApi.update(employee._id, payload);
        toast.success('Employee updated successfully');
      } else {
        await employeeApi.create(payload);
        toast.success('Employee created — login credentials sent to their email');
      }
      onSaved();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-brand-600" />
          {editing ? `Edit — ${employee.firstName} ${employee.lastName || ''}` : 'Add New Employee'}
        </div>
      }
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Tab bar */}
        <div className="mb-6 flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {TABS.map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(i)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === i
                  ? 'border-b-2 border-brand-600 text-brand-600'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Tab 0: Personal Info ── */}
        {tab === 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">First name <span className="text-red-500">*</span></label>
              <input className="input" placeholder="John" {...register('firstName', { required: 'First name is required' })} />
              {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" placeholder="Doe" {...register('lastName')} />
            </div>
            <div>
              <label className="label">Email address <span className="text-red-500">*</span></label>
              <input
                className="input"
                type="email"
                placeholder="john@company.com"
                disabled={editing}
                {...register('email', { required: 'Email is required' })}
              />
              {editing && <p className="mt-1 text-xs text-slate-400">Email cannot be changed after creation.</p>}
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Phone number</label>
              <input className="input" type="tel" placeholder="+91 9876543210" {...register('phone')} />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" {...register('gender')}>
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Date of birth</label>
              <input className="input" type="date" {...register('dateOfBirth')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <textarea className="input" rows={2} placeholder="123 Street, City, State" {...register('address')} />
            </div>
          </div>
        )}

        {/* ── Tab 1: Job Details ── */}
        {tab === 1 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Department</label>
              <select className="input" {...register('department')}>
                <option value="">— None —</option>
                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Designation</label>
              <select className="input" {...register('designation')}>
                <option value="">— None —</option>
                {designations.map((d) => <option key={d._id} value={d._id}>{d.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Branch / Location</label>
              <select className="input" {...register('branch')}>
                <option value="">— None —</option>
                {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Shift</label>
              <select className="input" {...register('shift')}>
                <option value="">— None —</option>
                {shifts.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reporting manager</label>
              <select className="input" {...register('reportingManager')}>
                <option value="">— None —</option>
                {managers.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.firstName} {m.lastName} ({m.employeeId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Employment type</label>
              <select className="input" {...register('employmentType')}>
                {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Role / Access level</label>
              <select className="input" {...register('role')}>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr">HR / Admin</option>
              </select>
              <p className="mt-1 text-xs text-slate-400">Determines what the employee can access in the system.</p>
            </div>
            <div>
              <label className="label">Joining date</label>
              <input className="input" type="date" {...register('joiningDate')} />
            </div>
          </div>
        )}

        {/* ── Tab 2: Salary ── */}
        {tab === 2 && (
          <div className="space-y-4">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Earnings</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="label">Basic salary</label>
                  <input type="number" min="0" className="input" placeholder="0" {...register('basicSalary')} />
                </div>
                <div>
                  <label className="label">HRA</label>
                  <input type="number" min="0" className="input" placeholder="0" {...register('hra')} />
                </div>
                <div>
                  <label className="label">Allowances</label>
                  <input type="number" min="0" className="input" placeholder="0" {...register('allowances')} />
                </div>
                <div>
                  <label className="label">Bonus</label>
                  <input type="number" min="0" className="input" placeholder="0" {...register('bonus')} />
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Deductions</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="label">PF</label>
                  <input type="number" min="0" className="input" placeholder="0" {...register('pf')} />
                </div>
                <div>
                  <label className="label">ESI</label>
                  <input type="number" min="0" className="input" placeholder="0" {...register('esi')} />
                </div>
                <div>
                  <label className="label">TDS</label>
                  <input type="number" min="0" className="input" placeholder="0" {...register('tds')} />
                </div>
                <div>
                  <label className="label">Other deductions</label>
                  <input type="number" min="0" className="input" placeholder="0" {...register('otherDeductions')} />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400">All amounts are monthly figures in the company's currency. Loss-of-pay is calculated automatically from attendance during payroll.</p>
          </div>
        )}

        {/* ── Tab 3: Bank & Emergency ── */}
        {tab === 3 && (
          <div className="space-y-6">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Bank Details</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Account holder name</label>
                  <input className="input" placeholder="John Doe" {...register('bankAccountName')} />
                </div>
                <div>
                  <label className="label">Account number</label>
                  <input className="input" placeholder="0001234567890" {...register('bankAccountNumber')} />
                </div>
                <div>
                  <label className="label">Bank name</label>
                  <input className="input" placeholder="State Bank of India" {...register('bankName')} />
                </div>
                <div>
                  <label className="label">IFSC code</label>
                  <input className="input" placeholder="SBIN0000001" {...register('ifsc')} />
                </div>
                <div>
                  <label className="label">PAN number</label>
                  <input className="input" placeholder="ABCDE1234F" maxLength={10} style={{ textTransform: 'uppercase' }} {...register('pan')} />
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Emergency Contact</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Contact name</label>
                  <input className="input" placeholder="Jane Doe" {...register('emergencyName')} />
                </div>
                <div>
                  <label className="label">Relation</label>
                  <input className="input" placeholder="Spouse / Parent" {...register('emergencyRelation')} />
                </div>
                <div>
                  <label className="label">Phone number</label>
                  <input className="input" type="tel" placeholder="+91 9876543210" {...register('emergencyPhone')} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex gap-2">
            {tab > 0 && (
              <button type="button" className="btn-secondary" onClick={() => setTab((t) => t - 1)}>
                ← Previous
              </button>
            )}
            {tab < TABS.length - 1 && (
              <button type="button" className="btn-secondary" onClick={() => setTab((t) => t + 1)}>
                Next →
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={saving}>
              {saving
                ? <><Spinner className="h-4 w-4 text-white" /> Saving…</>
                : editing ? 'Save changes' : 'Create employee'
              }
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
