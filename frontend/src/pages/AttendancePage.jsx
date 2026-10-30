import React, { useState, useMemo } from 'react';
import {
  CalendarCheck2,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  FileSpreadsheet
} from 'lucide-react';
import Badge from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import { isUserAdmin, isUserTeacher } from '../utils/permissions';
import { exportToExcel } from '../utils/excelExport';
import AdminAttendanceManager from '../components/admin/AdminAttendanceManager';

export default function AttendancePage() {
  const { attendance, updateAttendanceStatus, showToast, currentUser, currentTeacher } = useApp();
  const isAdmin = isUserAdmin(currentUser);
  const isTeacher = isUserTeacher(currentUser);

  if (isAdmin || isTeacher) {
    return <AdminAttendanceManager />;
  }
  const canEditAttendance = isUserAdmin(currentUser) || isTeacher;
  const [selectedDate, setSelectedDate] = useState('2026-10-26');

  const availableClasses = useMemo(() => {
    if (!isTeacher) {
      return ['Grade 10-A', 'Grade 10-B', 'Grade 11-A', 'Grade 12-Science'];
    }
    const raw = currentTeacher?.classesAssigned || currentTeacher?.classes_assigned || ['Grade 10-A'];
    const list = Array.isArray(raw) ? raw : String(raw).split(',').map(s => s.trim());
    return list.length ? list : ['Grade 10-A'];
  }, [isTeacher, currentTeacher]);

  const [selectedClass, setSelectedClass] = useState(() => availableClasses[0] || 'Grade 10-A');

  // Stats
  const presentCount = attendance.filter((a) => a.status === 'Present').length;
  const absentCount = attendance.filter((a) => a.status === 'Absent').length;
  const lateCount = attendance.filter((a) => a.status === 'Late').length;
  const excusedCount = attendance.filter((a) => a.status === 'Excused').length;
  const attendancePercentage = Math.round((presentCount / attendance.length) * 100) || 0;

  const handleMarkAllPresent = () => {
    attendance.forEach((record) => {
      updateAttendanceStatus(record.id, 'Present');
    });
    showToast('All students marked Present for today!');
  };

  const handleExportExcel = () => {
    try {
      const formattedData = attendance.map((a) => ({
        'Roll Number': a.roll,
        'Student ID': a.studentId,
        'Student Name': a.studentName,
        'Class / Section': selectedClass,
        'Date': selectedDate,
        'Attendance Status': a.status,
        'Remarks': a.remarks || 'None'
      }));

      exportToExcel(
        formattedData,
        `Attendance_Report_${selectedDate}.xlsx`,
        `Attendance_${selectedDate}`
      );
      showToast(`Exported ${attendance.length} attendance records to Excel!`, 'success');
    } catch (err) {
      showToast(`Failed to export attendance: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Daily Attendance Register</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Track student check-ins, tardiness, and verified leaves of absence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => showToast('Attendance register sent to printer preview', 'info')}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Sheet</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors shadow-xs"
            title="Export Attendance to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export (.xlsx)</span>
          </button>
          {canEditAttendance && (
            <button
              onClick={handleMarkAllPresent}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Mark All Present</span>
            </button>
          )}
        </div>
      </div>

      {/* Date & Class Controls */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700 shrink-0">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700 shrink-0">Class:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Cohort size: <strong className="text-slate-900">{attendance.length}</strong> students
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Present</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">{presentCount}</p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Absent</span>
            <p className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5">{absentCount}</p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 shrink-0">
            <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Late</span>
            <p className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">{lateCount}</p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-blue-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Turnout</span>
            <p className="text-xl sm:text-2xl font-black text-blue-800 mt-0.5">{attendancePercentage}%</p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 shrink-0">
            <CalendarCheck2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Mobile Attendance Cards (Visible on screens < md) */}
      <div className="block md:hidden space-y-3">
        {attendance.map((record) => (
          <div
            key={record.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                    #{record.roll}
                  </span>
                  <span className="text-xs font-mono text-slate-500 font-semibold">{record.studentId}</span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 mt-1">{record.studentName}</h4>
                {record.remarks && (
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">{record.remarks}</p>
                )}
              </div>
              <Badge text={record.status} size="xs" />
            </div>

            {canEditAttendance ? (
              <div className="pt-2 border-t border-slate-100 grid grid-cols-4 gap-1.5">
                {['Present', 'Absent', 'Late', 'Excused'].map((status) => {
                  const isCurrent = record.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => updateAttendanceStatus(record.id, status)}
                      className={`py-2 px-1 rounded-xl text-[11px] font-bold text-center transition-all ${
                        isCurrent
                          ? status === 'Present'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : status === 'Absent'
                            ? 'bg-rose-700 text-white shadow-xs'
                            : status === 'Late'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-blue-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100">Read-only register</p>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Attendance Register Table (Visible on screens >= md) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Roll</th>
                <th className="px-5 py-3.5">Student Name</th>
                <th className="px-5 py-3.5">Student ID</th>
                <th className="px-5 py-3.5">Current Status</th>
                <th className="px-5 py-3.5">Quick Toggle Attendance</th>
                <th className="px-5 py-3.5">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5 font-bold font-mono text-slate-900">{record.roll}</td>
                  <td className="px-5 py-3.5 font-bold text-slate-900">{record.studentName}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-500 font-semibold">{record.studentId}</td>
                  <td className="px-5 py-3.5">
                    <Badge text={record.status} size="xs" />
                  </td>
                  <td className="px-5 py-3.5">
                    {canEditAttendance ? (
                      <div className="flex items-center space-x-1.5">
                        {['Present', 'Absent', 'Late', 'Excused'].map((status) => {
                          const isCurrent = record.status === status;
                          return (
                            <button
                              key={status}
                              onClick={() => updateAttendanceStatus(record.id, status)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                                isCurrent
                                  ? status === 'Present'
                                    ? 'bg-emerald-700 text-white shadow-xs'
                                    : status === 'Absent'
                                    ? 'bg-rose-700 text-white shadow-xs'
                                    : status === 'Late'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'bg-blue-700 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-xs italic font-medium">Read-only register</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 font-medium">{record.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
