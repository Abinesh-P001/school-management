import React, { useState } from 'react';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  UserCheck,
  Calendar,
  X,
  Database,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Home
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isUserTeacher } from '../../utils/permissions';

export default function TopNav() {
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapse,
    currentUser,
    schoolInfo,
    currentPage,
    setCurrentPage,
    searchGlobal,
    setSearchGlobal,
    notices,
    isSupabaseConnected,
    handleLogout
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const pageDetails = {
    dashboard: { section: 'Overview', title: 'Academic Command Center' },
    students: { section: 'Academics', title: 'Student Directory & Admissions' },
    teachers: { section: 'Administration', title: 'Faculty & Academic Staff' },
    classes: { section: 'Academics', title: isUserTeacher(currentUser) ? 'My Assigned Classes & Sections' : 'Classes & Sections' },
    attendance: { section: 'Academics', title: 'Daily Attendance Register' },
    timetable: { section: 'Academics', title: 'Master Academic Timetable' },
    exams: { section: 'Assessments', title: 'Examinations, Tests & Marks' },
    fees: { section: 'Administration', title: 'Fee Invoicing & Payment Ledger' },
    reports: { section: 'Analytics', title: 'Academic & Financial Reports' },
    users: { section: 'Governance', title: 'User & Role Governance' },
    settings: { section: 'System', title: 'Institutional Settings' },
    parents: { section: 'Administration', title: 'Parent & Guardian Accounts' },
    announcements: { section: 'Administration', title: 'School Announcements & Bulletins' },
    parent_dashboard: { section: 'Parent Portal', title: 'Parent & Guardian Overview' },
    parent_children: { section: 'Parent Portal', title: 'My Children Academic Dossier' },
    parent_announcements: { section: 'Parent Portal', title: 'School Bulletins & Notices' },
  };

  const currentMeta = pageDetails[currentPage] || { section: 'Portal', title: 'Dashboard' };

  return (
    <header className="sticky top-0 z-30 bg-[#0F172A] border-b border-slate-800 text-white shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Left section: Hamburger (Mobile) + Desktop Toggle + Breadcrumbs */}
        <div className="flex items-center space-x-3 min-w-0">
          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 lg:hidden focus:outline-none shrink-0"
            aria-label="Toggle navigation drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop sidebar collapse toggle */}
          <button
            onClick={toggleSidebarCollapse}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-sky-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex items-center space-x-1.5 text-xs text-slate-400">
              <li className="flex items-center">
                <button
                  onClick={() => setCurrentPage('dashboard')}
                  className="flex items-center space-x-1 hover:text-sky-300 transition-colors"
                >
                  <Home className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline font-semibold">Oakridge</span>
                </button>
              </li>
              <li>
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              </li>
              <li className="hidden xs:inline font-medium text-slate-400 truncate">
                {currentMeta.section}
              </li>
              <li className="hidden xs:inline">
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
              </li>
              <li className="font-bold text-white truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
                {currentMeta.title}
              </li>
            </ol>
          </nav>
        </div>

        {/* Right section: Search + Status + Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 md:hidden focus:outline-none"
            aria-label="Toggle search input"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Global Search Input (Desktop & Tablet) */}
          <div className="relative hidden md:block w-52 lg:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search directory, classes..."
              value={searchGlobal}
              onChange={(e) => setSearchGlobal(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs font-medium bg-slate-900/90 text-white placeholder-slate-400 rounded-xl border border-slate-700 hover:border-slate-600 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
            />
            {searchGlobal && (
              <button
                onClick={() => setSearchGlobal('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Supabase DB Status */}
          <div
            title={isSupabaseConnected ? "Connected to Supabase PostgreSQL Database" : "Supabase PostgreSQL Database Synchronized"}
            className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 bg-emerald-950/60 rounded-xl text-[11px] font-bold text-emerald-300 border border-emerald-800/60"
          >
            <Database className="w-3 h-3 text-emerald-400" />
            <span>Supabase DB</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>

          {/* Academic Year Badge */}
          <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800/80 rounded-xl text-[11px] font-bold text-slate-300 border border-slate-700/80">
            <Calendar className="w-3 h-3 text-sky-400" />
            <span>AY {schoolInfo.academicYear}</span>
          </div>

          {/* Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowRoleMenu(false);
              }}
              className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="School Notices"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-[#0F172A]"></span>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-80 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                  <span className="text-xs font-extrabold text-slate-900">Campus Notices ({notices.length})</span>
                  <span className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">
                    Mark all read
                  </span>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {notices.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {n.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{n.date}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 leading-snug">{n.title}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">{n.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Role & User Popover */}
          <div className="relative">
            <button
              onClick={() => {
                setShowRoleMenu(!showRoleMenu);
                setShowNotifications(false);
              }}
              className="flex items-center space-x-2 pl-2 border-l border-slate-800 shrink-0 text-left focus:outline-none group"
              aria-label="User Account Menu"
            >
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                alt={currentUser?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-500/40 group-hover:ring-sky-400 transition-all"
              />
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight group-hover:text-sky-300 transition-colors truncate max-w-[120px]">
                  {currentUser?.name || 'User'}
                </p>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="text-[10px] font-semibold text-sky-400">
                    {currentUser?.role || 'Guest'}
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                </div>
              </div>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-60 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 pb-2.5 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signed In User</p>
                  <p className="text-xs font-black text-slate-900 mt-0.5 truncate">{currentUser?.name || 'User'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser?.email || ''}</p>
                  <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                    <UserCheck className="w-3 h-3 mr-1 text-blue-600" />
                    {currentUser?.role || 'User'} Portal
                  </div>
                </div>
                <div className="pt-2 px-2">
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors flex items-center justify-between"
                  >
                    <span>Sign Out / Switch Portal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Mobile Search Strip */}
      {showMobileSearch && (
        <div className="md:hidden px-4 pb-3 pt-1 border-t border-slate-800 bg-slate-900/90">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Search students, classes..."
              value={searchGlobal}
              onChange={(e) => setSearchGlobal(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs font-medium bg-[#0F172A] text-white placeholder-slate-400 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            {searchGlobal && (
              <button
                onClick={() => setSearchGlobal('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
