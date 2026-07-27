/**
 * Authenticated app shell: collapsible sidebar (role-aware nav) + top navbar
 * with theme toggle, notifications and a profile dropdown. Responsive: the
 * sidebar becomes an overlay drawer on mobile.
 */
import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarCheck, CalendarDays, Wallet, Megaphone,
  Building2, Database, BarChart3, Settings as SettingsIcon, Menu, X,
  Sun, Moon, Bell, LogOut, ChevronDown, UserCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { ROLES, ROLE_LABELS } from '../utils/constants';
import { initials } from '../utils/format';
import { announcementApi } from '../api/endpoints';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: 'all' },
  { to: '/companies', label: 'Companies', icon: Building2, roles: [ROLES.SUPER_ADMIN] },
  { to: '/employees', label: 'Employees', icon: Users, roles: [ROLES.SUPER_ADMIN, ROLES.HR, ROLES.MANAGER] },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: 'all' },
  { to: '/leaves', label: 'Leaves', icon: CalendarDays, roles: 'all' },
  { to: '/payroll', label: 'Payroll', icon: Wallet, roles: 'all' },
  { to: '/announcements', label: 'Announcements', icon: Megaphone, roles: 'all' },
  { to: '/master-data', label: 'Master Data', icon: Database, roles: [ROLES.SUPER_ADMIN, ROLES.HR] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: [ROLES.SUPER_ADMIN, ROLES.HR, ROLES.MANAGER] },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, roles: [ROLES.SUPER_ADMIN, ROLES.HR] },
];

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    announcementApi.unread().then(({ data }) => setUnread(data.data.count)).catch(() => {});
  }, []);

  const items = NAV.filter((n) => n.roles === 'all' || n.roles.includes(user.role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 font-bold text-white">H</div>
        <span className="text-lg font-bold text-slate-800 dark:text-white">HRMS</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-4 py-4 text-xs text-slate-400 dark:border-slate-800">
        {user.company?.name || 'HRMS Platform'}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:block">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-slate-900">{SidebarContent}</aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden text-sm text-slate-400 lg:block">
            Welcome back, <span className="font-medium text-slate-700 dark:text-slate-200">{user.name}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggle} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link to="/announcements" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] text-white">
                  {unread}
                </span>
              )}
            </Link>

            <div className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {initials(user.name)}
                </span>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium leading-tight text-slate-700 dark:text-slate-200">{user.name}</p>
                  <p className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800" onMouseLeave={() => setMenuOpen(false)}>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
                    <UserCircle className="h-4 w-4" /> My Profile
                  </Link>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
