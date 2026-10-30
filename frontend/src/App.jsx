import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import TeachersPage from './pages/TeachersPage';
import ClassesPage from './pages/ClassesPage';
import AttendancePage from './pages/AttendancePage';
import TimetablePage from './pages/TimetablePage';
import ExamsMarksPage from './pages/ExamsMarksPage';
import FeesPage from './pages/FeesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import LoginPage from './pages/LoginPage';
import ParentDashboardPage from './pages/ParentDashboardPage';
import ParentChildDetailPage from './pages/ParentChildDetailPage';
import ParentAnnouncementsPage from './pages/ParentAnnouncementsPage';
import ParentManagementPage from './pages/ParentManagementPage';
import AnnouncementsAdminPage from './pages/AnnouncementsAdminPage';

import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { canAccessPage, isUserParent } from './utils/permissions';

function MainApp() {
  const { currentPage, setCurrentPage, currentUser, isAuthenticated } = useApp();

  if (!isAuthenticated || currentPage === 'login') {
    return <LoginPage />;
  }

  // Enforce role-based access control for manually entered or switched page views
  const isAuthorized = canAccessPage(currentUser, currentPage);

  const renderCurrentPage = () => {
    if (!isAuthorized) {
      return (
        <div className="max-w-xl mx-auto my-16 bg-white rounded-3xl border border-rose-300 p-8 text-center shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-[#111827] tracking-tight">Access Restricted</h2>
          <p className="text-xs text-[#475569] font-medium mt-2 leading-relaxed">
            Your role (<strong className="text-slate-900">{currentUser?.role || 'Guest'}</strong>) is not authorized to access the{' '}
            <span className="font-mono text-rose-800 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded font-bold">{currentPage}</span> view.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to My Portal</span>
            </button>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return isUserParent(currentUser) ? <ParentDashboardPage /> : <DashboardPage />;
      case 'parent_dashboard':
        return <ParentDashboardPage />;
      case 'parent_children':
        return <ParentChildDetailPage />;
      case 'parent_announcements':
        return <ParentAnnouncementsPage />;
      case 'parents':
        return <ParentManagementPage />;
      case 'announcements':
        return isUserParent(currentUser) ? <ParentAnnouncementsPage /> : <AnnouncementsAdminPage />;
      case 'students':
        return <StudentsPage />;
      case 'teachers':
        return <TeachersPage />;
      case 'classes':
        return <ClassesPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'timetable':
        return <TimetablePage />;
      case 'exams':
        return <ExamsMarksPage />;
      case 'fees':
        return <FeesPage />;
      case 'reports':
        return <ReportsPage />;
      case 'users':
        return <UserManagementPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return <Layout>{renderCurrentPage()}</Layout>;
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
