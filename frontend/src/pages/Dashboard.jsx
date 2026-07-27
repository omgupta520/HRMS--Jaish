/**
 * Role-aware dashboard. Fetches /dashboard and renders the relevant widgets for
 * Super Admin, HR, Manager or Employee.
 */
import { useEffect, useState } from 'react';
import {
  Building2, Users, CalendarCheck, CalendarX, CalendarDays, Wallet,
  Clock, UserPlus, Cake, DollarSign,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { ROLES } from '../utils/constants';
import { StatCard, Loader, PageHeader, EmptyState, Badge } from '../components/ui';
import { fmtDate, fmtMoney } from '../utils/format';

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#0ea5e9', '#a855f7'];

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const currency = user.company?.currency || 'USD';

  useEffect(() => {
    dashboardApi.get().then(({ data }) => setData(data.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader label="Loading dashboard..." />;
  if (!data) return <EmptyState title="No dashboard data" />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Overview for ${user.name}`} />

      {user.role === ROLES.SUPER_ADMIN && <SuperAdmin data={data} currency={currency} />}
      {user.role === ROLES.HR && <Hr data={data} />}
      {user.role === ROLES.MANAGER && <Manager data={data} />}
      {user.role === ROLES.EMPLOYEE && <Employee data={data} currency={currency} />}
    </div>
  );
}

function SuperAdmin({ data, currency }) {
  const s = data.stats;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Companies" value={s.totalCompanies} icon={Building2} />
        <StatCard label="Active Companies" value={s.activeCompanies} icon={Building2} accent="green" />
        <StatCard label="Total Users" value={s.totalUsers} icon={Users} accent="sky" />
        <StatCard label="Est. MRR" value={fmtMoney(s.revenue, currency)} icon={DollarSign} accent="amber" />
      </div>
      <div className="card">
        <h3 className="mb-4 font-semibold">Recent Companies</h3>
        {data.recentCompanies.length === 0 ? (
          <EmptyState title="No companies yet" />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-slate-400">
              <tr><th className="pb-2">Name</th><th>Code</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {data.recentCompanies.map((c) => (
                <tr key={c._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 font-medium">{c.name}</td>
                  <td>{c.code}</td>
                  <td><Badge status={c.isActive ? 'active' : 'cancelled'}>{c.isActive ? 'Active' : 'Suspended'}</Badge></td>
                  <td>{fmtDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Hr({ data }) {
  const s = data.stats;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Employees" value={s.totalEmployees} icon={Users} />
        <StatCard label="Present Today" value={s.present} icon={CalendarCheck} accent="green" />
        <StatCard label="Absent Today" value={s.absent} icon={CalendarX} accent="red" />
        <StatCard label="On Leave" value={s.onLeave} icon={CalendarDays} accent="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h3 className="mb-4 font-semibold">Attendance — last 7 days</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.weeklyTrend}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="present" stroke="#6366f1" fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="mb-4 font-semibold">By Department</h3>
          {data.departmentDistribution.length === 0 ? (
            <EmptyState title="No data" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.departmentDistribution} dataKey="count" nameKey="department" innerRadius={50} outerRadius={80}>
                  {data.departmentDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <ListCard title="Pending Leaves" icon={CalendarDays} value={`${data.stats.pendingLeaves} requests`} />
        <PeopleCard title="New Joiners" icon={UserPlus} people={data.newJoiners.map((e) => ({ name: `${e.firstName} ${e.lastName || ''}`, sub: fmtDate(e.joiningDate) }))} />
        <PeopleCard title="Upcoming Birthdays" icon={Cake} people={data.upcomingBirthdays.map((b) => ({ name: b.name, sub: fmtDate(b.date) }))} />
      </div>
    </div>
  );
}

function Manager({ data }) {
  const s = data.stats;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Team Size" value={s.teamSize} icon={Users} />
        <StatCard label="Present Today" value={s.presentToday} icon={CalendarCheck} accent="green" />
        <StatCard label="Pending Approvals" value={s.pendingApprovals} icon={Clock} accent="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 font-semibold">My Team</h3>
          {data.team.length === 0 ? <EmptyState title="No team members" /> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.team.map((t) => (
                <li key={t._id} className="flex items-center justify-between py-2 text-sm">
                  <span>{t.firstName} {t.lastName}</span>
                  <span className="text-slate-400">{t.employeeId}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="mb-4 font-semibold">Team Leave Calendar</h3>
          {data.teamLeaves.length === 0 ? <EmptyState title="No upcoming leaves" /> : (
            <ul className="space-y-2">
              {data.teamLeaves.map((l) => (
                <li key={l._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                  <span>{l.employee?.firstName} {l.employee?.lastName}</span>
                  <span className="flex items-center gap-2">
                    <Badge status={l.status} />
                    <span className="text-slate-400">{fmtDate(l.startDate)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Employee({ data, currency }) {
  const s = data.stats;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Present This Month" value={s.presentThisMonth} icon={CalendarCheck} accent="green" />
        <StatCard label="Pending Leaves" value={s.pendingLeaves} icon={CalendarDays} accent="amber" />
        <StatCard label="Payslips" value={s.payslips} icon={Wallet} accent="sky" />
        <StatCard label="Profile Complete" value={`${s.profileCompletion}%`} icon={Users} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 font-semibold">My Recent Leaves</h3>
          {data.myLeaves.length === 0 ? <EmptyState title="No leave requests" /> : (
            <ul className="space-y-2">
              {data.myLeaves.map((l) => (
                <li key={l._id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                  <span>{l.leaveType?.name} · {l.days}d</span>
                  <Badge status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3 className="mb-4 font-semibold">Announcements</h3>
          {data.announcements.length === 0 ? <EmptyState title="No announcements" /> : (
            <ul className="space-y-3">
              {data.announcements.map((a) => (
                <li key={a._id} className="border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="line-clamp-2 text-xs text-slate-500">{a.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function ListCard({ title, icon: Icon, value }) {
  return (
    <div className="card">
      <div className="mb-2 flex items-center gap-2 text-slate-500">
        <Icon className="h-5 w-5" /> <h3 className="font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function PeopleCard({ title, icon: Icon, people }) {
  return (
    <div className="card">
      <div className="mb-3 flex items-center gap-2 text-slate-500">
        <Icon className="h-5 w-5" /> <h3 className="font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      </div>
      {people.length === 0 ? (
        <p className="text-sm text-slate-400">Nothing upcoming</p>
      ) : (
        <ul className="space-y-2">
          {people.map((p, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span>{p.name}</span>
              <span className="text-slate-400">{p.sub}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
