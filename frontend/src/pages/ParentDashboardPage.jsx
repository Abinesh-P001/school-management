import React, { useState, useEffect } from 'react';
import {
  Users,
  CalendarCheck,
  Award,
  Clock,
  CreditCard,
  Bell,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getApiBaseUrl } from '../config/api';

export default function ParentDashboardPage() {
  const {
    currentUser,
    parentProfile,
    parentChildren,
    activeChild,
    setActiveChild,
    setCurrentPage,
    unreadAnnouncementsCount,
    announcements,
    authToken
  } = useApp();

  const [childData, setChildData] = useState({
    attendance: null,
    results: null,
    fees: null,
    loading: true
  });

  const selectedChildId = activeChild?.id || (parentChildren[0]?.id);

  useEffect(() => {
    if (!selectedChildId) return;

    let isMounted = true;
    const token = authToken || localStorage.getItem('oakridge_auth_token');
    const backendBase = getApiBaseUrl();

    const fetchChildOverview = async () => {
      setChildData(prev => ({ ...prev, loading: true }));
      try {
        const [attRes, resRes, feeRes] = await Promise.all([
          fetch(`${backendBase}/parent/children/${selectedChildId}/attendance`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${backendBase}/parent/children/${selectedChildId}/results`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${backendBase}/parent/children/${selectedChildId}/fees`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const att = attRes.ok ? await attRes.json() : null;
        const res = resRes.ok ? await resRes.json() : null;
        const fee = feeRes.ok ? await feeRes.json() : null;

        if (isMounted) {
          setChildData({
            attendance: att,
            results: res,
            fees: fee,
            loading: false
          });
        }
      } catch (err) {
        if (isMounted) {
          setChildData(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchChildOverview();

    return () => {
      isMounted = false;
    };
  }, [selectedChildId, authToken]);

  const currentChild = parentChildren.find(c => c.id === selectedChildId) || activeChild || parentChildren[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Parent Welcome & Child Selector */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Official Parent & Guardian Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome, {parentProfile?.name || currentUser?.name || 'Parent'}
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Monitor your child's academic performance, daily attendance records, published exam results, and school bulletins in real time.
            </p>
          </div>

          {/* Child Selector Tabs */}
          {parentChildren.length > 1 && (
            <div className="bg-white/10 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl flex flex-wrap gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-300 px-3 py-1 flex items-center">
                Select Child:
              </span>
              {parentChildren.map((child) => {
                const isSelected = (currentChild?.id === child.id);
                return (
                  <button
                    key={child.id}
                    onClick={() => setActiveChild(child)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-2 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{child.name}</span>
                    <span className="text-[10px] opacity-80 font-normal">({child.grade || 'Student'})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Child Summary Pill */}
        {currentChild && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs ring-2 ring-white/20">
                {currentChild.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="font-extrabold text-white text-sm">{currentChild.name}</span>
                <span className="ml-2 px-2 py-0.5 rounded-md bg-white/10 text-slate-200 text-[10px] font-semibold">
                  {currentChild.student_id} • {currentChild.grade} {currentChild.section ? `(${currentChild.section})` : ''}
                </span>
              </div>
            </div>

            <button
              onClick={() => setCurrentPage('parent_children')}
              className="text-xs font-bold text-blue-300 hover:text-white flex items-center space-x-1 transition-colors"
            >
              <span>View Full Student Dossier</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Overview Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Today's Attendance */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Attendance</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline space-x-2">
              <span className={`text-xl font-black ${
                childData.attendance?.today_status === 'Present' ? 'text-emerald-700' :
                childData.attendance?.today_status === 'Absent' ? 'text-rose-700' : 'text-slate-800'
              }`}>
                {childData.loading ? '...' : (childData.attendance?.today_status || 'Present')}
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                ({childData.attendance?.attendance_rate || '98%'} overall)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Recorded in official register
            </p>
          </div>
        </div>

        {/* Latest Results */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exam Results</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-slate-900">
                {childData.loading ? '...' : (childData.results?.results?.length || 0)}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Published Exams</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Verified by Department Heads
            </p>
          </div>
        </div>

        {/* Upcoming Assessments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Exams</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-black text-slate-900">
                {childData.loading ? '...' : (childData.results?.upcoming_exams?.length || 0)}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Scheduled</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Next 30 days assessment calendar
            </p>
          </div>
        </div>

        {/* Outstanding Fees */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fee Balance</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline space-x-2">
              <span className={`text-xl font-black ${
                (childData.fees?.outstanding_balance || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                ${childData.loading ? '...' : (childData.fees?.outstanding_balance || 0).toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Outstanding</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Status: <span className="font-bold text-slate-700">{currentChild?.fees_status || 'Up to date'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Quick Access Navigation & Recent Bulletins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Child Modules Quick Access */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h2 className="text-base font-extrabold text-slate-900 mb-4 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-blue-700" />
              <span>Student Academic Hub: {currentChild?.name}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Daily Attendance Detail */}
              <button
                onClick={() => setCurrentPage('parent_children')}
                className="group p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left flex items-start space-x-3.5"
              >
                <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    Attendance History
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View daily check-ins, monthly attendance rate, and leave notes.
                  </p>
                </div>
              </button>

              {/* Published Results & Report Cards */}
              <button
                onClick={() => setCurrentPage('parent_children')}
                className="group p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-left flex items-start space-x-3.5"
              >
                <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0 group-hover:scale-105 transition-transform">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                    Exams & Report Cards
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official grades, passing marks, and printable term reports.
                  </p>
                </div>
              </button>

              {/* Class Timetable */}
              <button
                onClick={() => setCurrentPage('parent_children')}
                className="group p-4 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/30 transition-all text-left flex items-start space-x-3.5"
              >
                <div className="p-2.5 rounded-lg bg-teal-100 text-teal-700 shrink-0 group-hover:scale-105 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                    Class Timetable
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Weekly subject periods, classrooms, and assigned teachers.
                  </p>
                </div>
              </button>

              {/* Fees & Invoices */}
              <button
                onClick={() => setCurrentPage('parent_children')}
                className="group p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all text-left flex items-start space-x-3.5"
              >
                <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Tuition & Fee Ledger
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Invoices, due dates, payment history, and receipts.
                  </p>
                </div>
              </button>
            </div>

            {/* Profile Correction Action */}
            <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-slate-600" />
                <div>
                  <h5 className="text-xs font-bold text-slate-900">Need to update contact information?</h5>
                  <p className="text-[11px] text-slate-500">
                    Parents can submit formal correction requests for phone numbers or addresses.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCurrentPage('parent_children')}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-100 transition-colors shadow-xs"
              >
                Request Change
              </button>
            </div>
          </div>
        </div>

        {/* School Announcements Widget */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-blue-700" />
                <h3 className="text-base font-extrabold text-slate-900">School Bulletins</h3>
              </div>
              {unreadAnnouncementsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black animate-pulse">
                  {unreadAnnouncementsCount} Unread
                </span>
              )}
            </div>

            <div className="space-y-3">
              {announcements.slice(0, 3).map((ann) => (
                <div
                  key={ann.id}
                  onClick={() => setCurrentPage('parent_announcements')}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-slate-50/80 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">
                      {ann.category}
                    </span>
                    <span>{new Date(ann.publish_date).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1">
                    {ann.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                    {ann.content}
                  </p>
                </div>
              ))}

              {announcements.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">
                  No active bulletins at this time.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setCurrentPage('parent_announcements')}
            className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-all flex items-center justify-center space-x-1"
          >
            <span>View All School Bulletins</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

