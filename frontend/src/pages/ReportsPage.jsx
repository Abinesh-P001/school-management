import { useState } from 'react';
import {
  Download,
  TrendingUp,
  Award,
  Users,
  DollarSign,
  CalendarCheck2,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportToExcel } from '../utils/excelExport';

export default function ReportsPage() {
  const { showToast } = useApp();
  const [selectedReport, setSelectedReport] = useState('academic');

  const handleExportExcel = () => {
    try {
      if (selectedReport === 'academic') {
        const data = [
          { 'Metric / Subject': 'Overall Pass Rate', 'Value / Average': '97.8%', 'Status / Notes': '+2.1% Improvement vs last semester' },
          { 'Metric / Subject': 'Campus Honors List', 'Value / Average': '42 Students', 'Status / Notes': 'GPA > 3.85 threshold' },
          { 'Metric / Subject': 'Advanced Physics', 'Value / Average': '88.0%', 'Status / Notes': 'Class average score' },
          { 'Metric / Subject': 'Pure Mathematics & Calculus', 'Value / Average': '84.0%', 'Status / Notes': 'Class average score' },
          { 'Metric / Subject': 'Computer Science & AI', 'Value / Average': '92.0%', 'Status / Notes': 'Class average score' },
          { 'Metric / Subject': 'English Literature', 'Value / Average': '86.0%', 'Status / Notes': 'Class average score' },
          { 'Metric / Subject': 'History & Global Politics', 'Value / Average': '82.0%', 'Status / Notes': 'Class average score' },
        ];
        exportToExcel(data, 'Academic_Performance_Report.xlsx', 'Academic_Performance');
        showToast('Exported Academic Performance report to Excel!', 'success');
      } else if (selectedReport === 'attendance') {
        const data = [
          { 'Month': 'August', 'Attendance Rate': '96.2%', 'Semester': 'Semester 1', 'Benchmark Status': 'Target Met' },
          { 'Month': 'September', 'Attendance Rate': '97.5%', 'Semester': 'Semester 1', 'Benchmark Status': 'Target Met' },
          { 'Month': 'October', 'Attendance Rate': '98.1%', 'Semester': 'Semester 1', 'Benchmark Status': 'Peak Performance' },
          { 'Month': 'November', 'Attendance Rate': '96.8%', 'Semester': 'Semester 1', 'Benchmark Status': 'Target Met' },
          { 'Month': 'December', 'Attendance Rate': '95.9%', 'Semester': 'Semester 1', 'Benchmark Status': 'Target Met' },
        ];
        exportToExcel(data, 'Attendance_Trends_Report.xlsx', 'Attendance_Trends');
        showToast('Exported Attendance Trends report to Excel!', 'success');
      } else if (selectedReport === 'financial') {
        const data = [
          { 'Accounting Category': 'Realized Tuition Revenue', 'Amount (₹ INR)': '₹4,900.00', 'Clearance Rate': '82% on-time clearance', 'Status': 'Cleared' },
          { 'Accounting Category': 'Receivables (30 Days Grace)', 'Amount (₹ INR)': '₹2,600.00', 'Clearance Rate': 'Pending clearance', 'Status': 'Pending' },
          { 'Accounting Category': 'Overdue Aging Ledger', 'Amount (₹ INR)': '₹1,200.00', 'Clearance Rate': 'Follow-ups active', 'Status': 'Overdue' },
        ];
        exportToExcel(data, 'Financial_Collections_Report.xlsx', 'Financial_Report');
        showToast('Exported Financial Collections report to Excel!', 'success');
      } else {
        const data = [
          { 'Demographic Group': 'Female Students', 'Percentage': '52%', 'Ratio': '1 : 1.08', 'Status': 'Active' },
          { 'Demographic Group': 'Male Students', 'Percentage': '48%', 'Ratio': '1 : 1.08', 'Status': 'Active' },
          { 'Demographic Group': 'Faculty-to-Student Ratio', 'Percentage': '1 : 15', 'Ratio': '1 : 15', 'Status': 'Optimal' },
        ];
        exportToExcel(data, 'Demographics_Report.xlsx', 'Demographics');
        showToast('Exported Demographics report to Excel!', 'success');
      }
    } catch (err) {
      showToast(`Failed to export report: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 shadow-sm">
        <div>
          <h1 className="text-xl font-extrabold text-[#111827] tracking-tight">Institutional Analytics & Official Reports</h1>
          <p className="text-xs text-[#475569] font-medium mt-1">
            Generate and export aggregated administrative, academic, and financial reports.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors shadow-xs"
            title="Export Current Report to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Report (.xlsx)</span>
          </button>
          <button
            onClick={() => showToast('Compiling complete institutional dossier...', 'info')}
            className="inline-flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-sm hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Full Dossier (PDF)</span>
          </button>
        </div>
      </div>

      {/* Report Types Pills */}
      <div className="flex items-center space-x-2 sm:space-x-3 border-b border-slate-300 pb-3 overflow-x-auto">
        {[
          { id: 'academic', label: 'Academic Performance', icon: Award },
          { id: 'attendance', label: 'Campus Attendance Trends', icon: CalendarCheck2 },
          { id: 'financial', label: 'Financial & Fee Collections', icon: DollarSign },
          { id: 'demographics', label: 'Enrollment & Demographics', icon: Users },
        ].map((rep) => {
          const Icon = rep.icon;
          return (
            <button
              key={rep.id}
              onClick={() => setSelectedReport(rep.id)}
              className={`flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedReport === rep.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{rep.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Body 1: Academic Performance */}
      {selectedReport === 'academic' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-300 shadow-sm">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Overall Pass Rate</span>
              <p className="text-2xl sm:text-3xl font-black text-blue-700 mt-2">97.8%</p>
              <p className="text-xs text-emerald-700 font-bold mt-1 flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-1" /> +2.1% improvement
              </p>
            </div>
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-300 shadow-sm">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Campus Honors List</span>
              <p className="text-2xl sm:text-3xl font-black text-[#111827] mt-2">42 Students</p>
              <p className="text-xs text-[#475569] font-medium mt-1">GPA &gt; 3.85 threshold</p>
            </div>
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-300 shadow-sm sm:col-span-2 md:col-span-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top Subject</span>
              <p className="text-2xl sm:text-3xl font-black text-[#172554] mt-2">Physics & CS</p>
              <p className="text-xs text-[#475569] font-medium mt-1">Class average 89.2%</p>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 shadow-sm">
            <h3 className="text-sm font-extrabold text-[#111827] mb-4">Subject-Wise Performance Distribution</h3>
            <div className="space-y-4">
              {[
                { subject: 'Advanced Physics', avg: '88%', bar: 'w-[88%]', color: 'bg-blue-600' },
                { subject: 'Pure Mathematics & Calculus', avg: '84%', bar: 'w-[84%]', color: 'bg-indigo-600' },
                { subject: 'Computer Science & AI', avg: '92%', bar: 'w-[92%]', color: 'bg-cyan-600' },
                { subject: 'English Literature', avg: '86%', bar: 'w-[86%]', color: 'bg-emerald-600' },
                { subject: 'History & Global Politics', avg: '82%', bar: 'w-[82%]', color: 'bg-amber-600' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-800">{item.subject}</span>
                    <span className="font-extrabold text-slate-900">{item.avg}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div className={`${item.color} ${item.bar} h-full rounded-full transition-all duration-500`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Body 2: Attendance Trends */}
      {selectedReport === 'attendance' && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-300">
            <div>
              <h3 className="text-sm font-extrabold text-[#111827]">Campus Attendance Averages (Semester 1)</h3>
              <p className="text-xs text-[#475569] font-medium">Aggregated across all registered grade levels</p>
            </div>
            <button
              onClick={() => showToast('Exporting attendance report...', 'info')}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center">
            {['August', 'September', 'October', 'November', 'December'].map((m, i) => {
              const rates = ['96.2%', '97.5%', '98.1%', '96.8%', '95.9%'];
              return (
                <div key={m} className="p-3 sm:p-4 rounded-xl bg-slate-50 border border-slate-300">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase">{m}</span>
                  <p className="text-lg sm:text-xl font-black text-blue-700 mt-1">{rates[i]}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report Body 3: Financial & Fee Collections */}
      {selectedReport === 'financial' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-4 border-b border-slate-300">
            <div>
              <h3 className="text-sm font-extrabold text-[#111827]">Tuition & Fee Collection Health</h3>
              <p className="text-xs text-[#475569] font-medium">Collected vs pending receivables overview</p>
            </div>
            <button
              onClick={() => showToast('Printing financial summary report...', 'info')}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              Print Statement
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300">
              <span className="text-xs text-emerald-900 font-bold uppercase tracking-wider">Realized Revenue</span>
              <p className="text-2xl font-black text-emerald-800 mt-1">₹4,900.00</p>
              <p className="text-xs text-emerald-700 font-semibold mt-0.5">82% on-time clearance</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300">
              <span className="text-xs text-amber-900 font-bold uppercase tracking-wider">Receivables (30 Days)</span>
              <p className="text-2xl font-black text-amber-800 mt-1">₹2,600.00</p>
              <p className="text-xs text-amber-700 font-semibold mt-0.5">Invoices pending grace period</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-300">
              <span className="text-xs text-rose-900 font-bold uppercase tracking-wider">Overdue Aging</span>
              <p className="text-2xl font-black text-rose-800 mt-1">₹1,200.00</p>
              <p className="text-xs text-rose-700 font-semibold mt-0.5">Follow-up notifications active</p>
            </div>
          </div>
        </div>
      )}

      {/* Report Body 4: Demographics */}
      {selectedReport === 'demographics' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-[#111827]">Student & Faculty Distribution by Grade</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-300">
              <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Gender Demographics</h4>
              <div className="flex items-center space-x-6">
                <div>
                  <span className="text-2xl font-black text-blue-600">52%</span>
                  <p className="text-xs text-slate-700 font-medium">Female Students</p>
                </div>
                <div>
                  <span className="text-2xl font-black text-indigo-700">48%</span>
                  <p className="text-xs text-slate-700 font-medium">Male Students</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-300">
              <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Faculty-to-Student Ratio</h4>
              <div className="flex items-center space-x-6">
                <div>
                  <span className="text-2xl font-black text-emerald-700">1 : 15</span>
                  <p className="text-xs text-slate-700 font-medium">Optimal Class Attention</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
