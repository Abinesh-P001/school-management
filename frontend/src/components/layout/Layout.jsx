import React from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import Toast from '../common/Toast';
import { useApp } from '../../context/AppContext';

export default function Layout({ children }) {
  const { toast, setToast, sidebarCollapsed } = useApp();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex selection:bg-blue-600 selection:text-white">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Navigation */}
        <TopNav />

        {/* Page Inner Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {children}
        </main>
      </div>

      {/* Toast Alert */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
