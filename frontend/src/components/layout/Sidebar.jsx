import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  School,
  CalendarCheck2,
  CalendarDays,
  FileSpreadsheet,
  Receipt,
  FileBarChart2,
  Settings,
  LogOut,
  X,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  HeartHandshake
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { normalizeRole, canAccessPage, isUserTeacher, isUserParent, isUserAdmin } from '../../utils/permissions';

export default function Sidebar() {
  const {
    currentPage,
    setCurrentPage,
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapse,
    currentUser,
    handleLogout,
    unreadAnnouncementsCount
  } = useApp();

  const isTeacher = isUserTeacher(currentUser);
  const isParent = isUserParent(currentUser);
  const isAdmin = isUserAdmin(currentUser);

  const allNavItems = isParent ? [
    { id: 'dashboard', label: 'Parent Portal', icon: LayoutDashboard },
    { id: 'parent_children', label: 'My Children', icon: GraduationCap },
    { id: 'parent_announcements', label: 'School Bulletins', icon: Bell, badge: unreadAnnouncementsCount },
  ] : [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'classes', label: isTeacher ? 'My Classes' : 'Classes', icon: School },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck2 },
    { id: 'timetable', label: 'Timetable', icon: CalendarDays },
    { id: 'exams', label: 'Exams & Marks', icon: FileSpreadsheet },
    { id: 'fees', label: 'Fee Management', icon: Receipt },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'parents', label: 'Parent Management', icon: HeartHandshake },
    { id: 'reports', label: 'Reports', icon: FileBarChart2 },
    { id: 'users', label: 'User Management', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const navItems = allNavItems.filter((item) => canAccessPage(currentUser, item.id));

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#0F172A] border-r border-slate-800 flex flex-col transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} w-72 max-w-[85vw] shadow-xl`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center border-b border-slate-800/80 bg-[#0F172A] text-white px-4 ${
            sidebarCollapsed ? 'lg:justify-center justify-between' : 'justify-between'
          }`}
        >
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 border border-white/20 flex items-center justify-center text-xl text-white shadow-md shrink-0">
              🎓
            </div>
            {(!sidebarCollapsed || sidebarOpen) && (
              <div className="min-w-0 transition-opacity duration-200">
                <h1 className="font-black text-base tracking-tight leading-tight text-white truncate">Oakridge</h1>
                <span className="text-[10px] font-semibold tracking-wider text-sky-400 uppercase block truncate">
                  School System
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={toggleSidebarCollapse}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-sky-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Role Card */}
        <div
          className={`border-b border-slate-800/80 bg-slate-900/70 transition-all ${
            sidebarCollapsed ? 'lg:p-3 p-4' : 'px-4 py-3.5'
          }`}
        >
          <div className={`flex items-center ${sidebarCollapsed ? 'lg:justify-center space-x-3' : 'space-x-3'}`}>
            <div className="relative shrink-0">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                alt={currentUser?.name || 'User'}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-sky-500/50"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900"></span>
            </div>

            {(!sidebarCollapsed || sidebarOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'User'}</p>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950 text-sky-300 border border-sky-800/60 truncate">
                    <ShieldCheck className="w-2.5 h-2.5 mr-1 text-sky-400 shrink-0" />
                    {currentUser?.role || 'User'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {(!sidebarCollapsed || sidebarOpen) && (
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => {
                    setCurrentPage(item.id);
                    setSidebarOpen(false);
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center rounded-xl text-xs font-bold transition-all duration-150 ${
                    sidebarCollapsed
                      ? 'lg:justify-center p-2.5'
                      : 'justify-between px-3 py-2.5'
                  } ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className={`flex items-center ${sidebarCollapsed ? 'lg:space-x-0 space-x-3' : 'space-x-3'}`}>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-300'}`} />
                    {(!sidebarCollapsed || sidebarOpen) && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>
                  {(!sidebarCollapsed || sidebarOpen) && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px] ml-auto">
                      {item.badge}
                    </span>
                  )}
                  {(!sidebarCollapsed || sidebarOpen) && isActive && !item.badge && (
                    <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />
                  )}
                </button>

                {/* Floating tooltip when collapsed on desktop */}
                {sidebarCollapsed && (
                  <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-xl border border-slate-700 whitespace-nowrap z-50 pointer-events-none">
                    {item.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Quick Action / Logout */}
        <div className={`p-3 border-t border-slate-800/80 bg-slate-950/60 ${sidebarCollapsed ? 'lg:p-2' : ''}`}>
          <div className="relative group">
            <button
              onClick={handleLogout}
              title={sidebarCollapsed ? "Sign Out / Switch Portal" : undefined}
              className={`w-full flex items-center rounded-xl border border-slate-800 bg-slate-900/50 text-slate-300 hover:text-white hover:bg-rose-950/40 hover:border-rose-800 text-xs font-bold transition-colors ${
                sidebarCollapsed
                  ? 'lg:justify-center p-2.5'
                  : 'justify-center space-x-2 px-3 py-2.5'
              }`}
            >
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400 shrink-0" />
              {(!sidebarCollapsed || sidebarOpen) && (
                <span className="truncate">Sign Out</span>
              )}
            </button>

            {sidebarCollapsed && (
              <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-slate-900 text-rose-300 text-xs font-semibold rounded-md shadow-xl border border-slate-700 whitespace-nowrap z-50 pointer-events-none">
                Sign Out
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
