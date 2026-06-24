import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, ClipboardList, BookOpen, FolderKanban,
  LogOut, Building2, Menu, X, ChevronRight
} from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { path: '/dashboard', label: 'Дашборд', icon: LayoutDashboard, adminOnly: true },
    { path: '/operations', label: 'Операции', icon: ClipboardList, adminOnly: false },
    { path: '/references', label: 'Справочники', icon: BookOpen, adminOnly: false },
    { path: '/projects', label: 'Проекты', icon: FolderKanban, adminOnly: false },
  ];

  const filteredNav = navItems.filter(item =>
    !item.adminOnly || user?.role === 'admin'
  );

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'operator': return 'Оператор';
      case 'project_manager': return 'Менеджер проекта';
      default: return role;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 bg-slate-900 text-white transition-all duration-300
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-16 lg:translate-x-0 overflow-hidden'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className={`p-4 border-b border-slate-700 flex items-center gap-3 ${!sidebarOpen && 'lg:justify-center'}`}>
            <div className="w-9 h-9 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="font-bold text-sm leading-tight">Финансовый учёт</p>
                <p className="text-xs text-slate-400">Строительство</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {filteredNav.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive: navActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm
                    ${isActive || navActive
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                    ${!sidebarOpen && 'lg:justify-center'}
                  `}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </nav>

          {/* User & Logout */}
          <div className="p-3 border-t border-slate-700 space-y-2">
            {sidebarOpen && user && (
              <div className="px-3 py-2 bg-slate-800 rounded-lg">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{getRoleLabel(user.role)}</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className={`w-full text-slate-300 hover:text-white hover:bg-slate-800 ${!sidebarOpen && 'lg:justify-center'}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {sidebarOpen && <span className="ml-2">Выйти</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 h-14 flex items-center px-4 gap-4 shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center text-sm text-slate-500">
            <span>Главная</span>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-slate-800 font-medium">
              {filteredNav.find(n => location.pathname.startsWith(n.path))?.label || 'Дашборд'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
