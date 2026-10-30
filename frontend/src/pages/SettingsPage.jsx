import { useState } from 'react';
import {
  School,
  Save,
  Bell,
  Shield,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SettingsPage() {
  const { schoolInfo, setSchoolInfo, showToast } = useApp();
  const [formData, setFormData] = useState({ ...schoolInfo });
  const [notifications, setNotifications] = useState({
    feeReminders: true,
    attendanceAlerts: true,
    examNotices: true,
    dailySummary: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSchoolInfo(formData);
    showToast('School profile configuration updated successfully!');
  };

  const handleReset = () => {
    setFormData({ ...schoolInfo });
    showToast('Settings reset to saved values', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-[#111827] tracking-tight">Institutional Configuration & Settings</h1>
          <p className="text-xs text-[#475569] font-medium mt-1">
            General institute branding, academic calendar parameters, access control, and communication policies.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 sm:py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            form="settings-form"
            type="submit"
            className="inline-flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Left Column: School Profile Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 border border-slate-300 shadow-sm">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-300 mb-5">
            <School className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-extrabold text-[#111827]">Institution Identity & Profile</h3>
          </div>

          <form id="settings-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Official School Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Institutional Motto / Tagline
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  School Code / Registration
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Active Academic Year
                </label>
                <input
                  type="text"
                  value={formData.academicYear}
                  onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Campus Physical Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Administrative Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Official Phone Contact
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Principal / Headmaster Name
              </label>
              <input
                type="text"
                value={formData.principal}
                onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </form>
        </div>

        {/* Right Column: Notification Preferences & Roles */}
        <div className="space-y-5 sm:space-y-6">
          {/* Notification Preferences */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-300 shadow-sm">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-300 mb-4">
              <Bell className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-extrabold text-[#111827]">Communication Policies</h3>
            </div>

            <div className="space-y-3.5">
              {[
                { id: 'feeReminders', title: 'Automated Fee Reminders', desc: 'Send SMS & email 5 days prior to fee due date' },
                { id: 'attendanceAlerts', title: 'Absence SMS Dispatch', desc: 'Instant parent notification if student marked absent' },
                { id: 'examNotices', title: 'Exam Hall Ticket Alerts', desc: 'Broadcast schedule announcements to portal' },
                { id: 'dailySummary', title: 'Daily Principal Digest', desc: 'Receive nightly executive metrics snapshot' },
              ].map((item) => (
                <div key={item.id} className="flex items-start justify-between">
                  <div className="pr-2">
                    <p className="text-xs font-bold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-600 font-medium leading-snug">{item.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications[item.id]}
                    onChange={(e) =>
                      setNotifications({ ...notifications, [item.id]: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 border-slate-300 mt-1 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Role-Based Permissions Matrix Overview */}
          <div className="bg-white rounded-2xl p-6 border border-slate-300 shadow-sm">
            <div className="flex items-center space-x-2 pb-4 border-b border-slate-300 mb-4">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-extrabold text-[#111827]">Portal Security Matrix</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">Administrator</span>
                  <span className="block text-[11px] text-slate-600 font-medium">Full CRUD, fee ledger, system configuration</span>
                </div>
                <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 border border-blue-300 text-blue-900">Root Access</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">Faculty / Teacher</span>
                  <span className="block text-[11px] text-slate-600 font-medium">Mark attendance, input grades, view schedule</span>
                </div>
                <span className="px-2 py-1 rounded text-xs font-bold bg-indigo-100 border border-indigo-300 text-indigo-900">Academic</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">Student / Guardian</span>
                  <span className="block text-[11px] text-slate-600 font-medium">View marks card, fee receipts, notices</span>
                </div>
                <span className="px-2 py-1 rounded text-xs font-bold bg-emerald-100 border border-emerald-300 text-emerald-900">Read Only</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
