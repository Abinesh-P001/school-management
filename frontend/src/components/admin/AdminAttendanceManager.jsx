import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  GraduationCap,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  FileSpreadsheet,
  Save,
  Search,
  Filter,
  Loader2,
  Check,
  AlertCircle,
  School,
  ChevronDown,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { exportToExcel } from '../../utils/excelExport';
import { getApiBaseUrl } from '../../config/api';
import { isClassAssignedToTeacher, isUserTeacher } from '../../utils/permissions';

export default function AdminAttendanceManager() {
  const { authToken, teachers, classes, showToast, refreshData, currentUser, currentTeacher, teacherAssignments } = useApp();

  const isTeacher = isUserTeacher(currentUser);
  const [mainTab, setMainTab] = useState(isTeacher ? 'student' : 'teacher'); // 'teacher' | 'student'

  const backendBase = getApiBaseUrl();

  // ---------------------------------------------------------------------------
  // TAB A: TEACHER ATTENDANCE STATE
  // ---------------------------------------------------------------------------
  const [teacherDate, setTeacherDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [teacherFilterId, setTeacherFilterId] = useState('All');
  const [teacherFilterStatus, setTeacherFilterStatus] = useState('All');
  const [teacherAttendanceList, setTeacherAttendanceList] = useState([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherSaving, setTeacherSaving] = useState(false);

  // Load teacher attendance for selected date
  const fetchTeacherAttendance = useCallback(async () => {
    setTeacherLoading(true);
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const res = await fetch(`${backendBase}/teacher-attendance/?date=${teacherDate}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const recorded = await res.json();
        const recordedMap = new Map(recorded.map(r => [r.teacher_id, r]));

        // Merge with all known teachers so every faculty member has a record to mark
        const merged = teachers.map((t) => {
          const rec = recordedMap.get(t.id);
          return {
            teacher_id: t.id,
            employee_id: t.employeeId || t.employee_id || `TCH-${t.id}`,
            name: t.name,
            department: t.department || 'Faculty',
            subject: t.subject || 'All Subjects',
            status: rec ? rec.status : 'Present',
            remarks: rec ? (rec.remarks || '') : '',
            record_id: rec ? rec.id : null
          };
        });
        setTeacherAttendanceList(merged);
      }
    } catch (err) {
      console.warn('Error fetching teacher attendance:', err);
    } finally {
      setTeacherLoading(false);
    }
  }, [authToken, backendBase, teacherDate, teachers]);

  useEffect(() => {
    fetchTeacherAttendance();
  }, [fetchTeacherAttendance]);

  // Teacher Attendance Summary calculations
  const teacherStats = useMemo(() => {
    const total = teacherAttendanceList.length;
    const present = teacherAttendanceList.filter(t => t.status === 'Present').length;
    const absent = teacherAttendanceList.filter(t => t.status === 'Absent').length;
    const late = teacherAttendanceList.filter(t => t.status === 'Late').length;
    const leave = teacherAttendanceList.filter(t => t.status === 'Leave').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, late, leave, rate };
  }, [teacherAttendanceList]);

  // Mark all teachers Present
  const handleMarkAllTeachersPresent = () => {
    setTeacherAttendanceList(prev => prev.map(t => ({ ...t, status: 'Present' })));
    showToast('All teachers marked Present for selected date.', 'info');
  };

  // Update single teacher status in state
  const handleTeacherStatusChange = (teacherId, newStatus) => {
    setTeacherAttendanceList(prev =>
      prev.map(t => (t.teacher_id === teacherId ? { ...t, status: newStatus } : t))
    );
  };

  // Update single teacher remarks in state
  const handleTeacherRemarksChange = (teacherId, newRemarks) => {
    setTeacherAttendanceList(prev =>
      prev.map(t => (t.teacher_id === teacherId ? { ...t, remarks: newRemarks } : t))
    );
  };

  // Save all teacher attendance records (Bulk Upsert)
  const handleSaveTeacherAttendance = async () => {
    setTeacherSaving(true);
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const payload = {
        attendance_date: teacherDate,
        records: teacherAttendanceList.map(t => ({
          teacher_id: t.teacher_id,
          status: t.status,
          remarks: t.remarks || null
        }))
      };

      const res = await fetch(`${backendBase}/teacher-attendance/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to save teacher attendance.');
      }

      showToast(`Teacher attendance saved successfully for ${teacherDate}!`, 'success');
      await fetchTeacherAttendance();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setTeacherSaving(false);
    }
  };

  // Export Teacher Attendance to Excel
  const handleExportTeacherExcel = () => {
    try {
      const data = filteredTeacherList.map(t => ({
        'Teacher ID': t.employee_id,
        'Teacher Name': t.name,
        'Department': t.department,
        'Subject': t.subject,
        'Date': teacherDate,
        'Attendance Status': t.status,
        'Remarks': t.remarks || 'None'
      }));

      exportToExcel(data, `Teacher_Attendance_${teacherDate}.xlsx`, `Teacher_Attendance`);
      showToast(`Exported ${data.length} teacher attendance records!`, 'success');
    } catch (err) {
      showToast(`Failed to export: ${err.message}`, 'error');
    }
  };

  // Filtered Teacher List
  const filteredTeacherList = teacherAttendanceList.filter((t) => {
    if (teacherFilterId !== 'All' && String(t.teacher_id) !== String(teacherFilterId)) return false;
    if (teacherFilterStatus !== 'All' && t.status !== teacherFilterStatus) return false;
    return true;
  });

  // ---------------------------------------------------------------------------
  // TAB B: CLASS STUDENT ATTENDANCE STATE
  // ---------------------------------------------------------------------------
  // Teacher assigned classes scope
  const targetClasses = useMemo(() => {
    if (!isTeacher) return classes;
    const assigned = classes.filter(c => isClassAssignedToTeacher(c.id, teacherAssignments, currentTeacher));
    return assigned.length > 0 ? assigned : classes;
  }, [classes, isTeacher, teacherAssignments, currentTeacher]);

  // Extract unique class names (e.g. Grade 8, Grade 9, Grade 10, Grade 11, Grade 12)
  const availableClassNames = useMemo(() => {
    const setNames = new Set(targetClasses.map(c => c.name));
    return Array.from(setNames).sort();
  }, [targetClasses]);

  const [studentClassName, setStudentClassName] = useState(() => availableClassNames[0] || 'Grade 10');
  
  // Sync selected class name when targetClasses/availableClassNames change
  useEffect(() => {
    if (availableClassNames.length > 0 && !availableClassNames.includes(studentClassName)) {
      setStudentClassName(availableClassNames[0]);
    }
  }, [availableClassNames, studentClassName]);

  useEffect(() => {
    if (isTeacher) {
      setMainTab('student');
    }
  }, [isTeacher]);

  // Available sections for the selected class name
  const availableSections = useMemo(() => {
    return targetClasses
      .filter(c => c.name === studentClassName)
      .map(c => c.section);
  }, [targetClasses, studentClassName]);

  const [studentSection, setStudentSection] = useState(() => availableSections[0] || 'A');

  // Keep section valid if class name changes
  useEffect(() => {
    if (availableSections.length > 0 && !availableSections.includes(studentSection)) {
      setStudentSection(availableSections[0]);
    }
  }, [availableSections, studentSection]);

  // Matching classroom object
  const activeClassroom = useMemo(() => {
    return targetClasses.find(c => c.name === studentClassName && c.section === studentSection) || targetClasses[0];
  }, [targetClasses, studentClassName, studentSection]);

  const [studentDate, setStudentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [studentFilterStatus, setStudentFilterStatus] = useState('All');
  const [studentRosterData, setStudentRosterData] = useState({ summary: {}, students: [] });
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentSaving, setStudentSaving] = useState(false);

  // Fetch dynamic roster for active class & section on selected date
  const fetchStudentRoster = useCallback(async () => {
    if (!activeClassroom?.id) return;

    setStudentLoading(true);
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const res = await fetch(
        `${backendBase}/attendance/class-roster?class_id=${activeClassroom.id}&date=${studentDate}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (res.ok) {
        const data = await res.json();
        setStudentRosterData(data);
      }
    } catch (err) {
      console.warn('Error fetching class roster attendance:', err);
    } finally {
      setStudentLoading(false);
    }
  }, [activeClassroom?.id, studentDate, backendBase, authToken]);

  useEffect(() => {
    fetchStudentRoster();
  }, [fetchStudentRoster]);

  // Mark all students present
  const handleMarkAllStudentsPresent = () => {
    setStudentRosterData(prev => ({
      ...prev,
      students: prev.students.map(s => ({ ...s, status: 'Present' })),
      summary: {
        ...prev.summary,
        present: prev.students.length,
        absent: 0,
        late: 0,
        leave: 0,
        attendance_rate: 100.0
      }
    }));
    showToast(`All students marked Present for ${studentClassName} - Section ${studentSection}!`, 'info');
  };

  // Change single student status
  const handleStudentStatusChange = (studentId, newStatus) => {
    setStudentRosterData(prev => {
      const updated = prev.students.map(s => s.student_id === studentId ? { ...s, status: newStatus } : s);
      const total = updated.length;
      const present = updated.filter(s => s.status === 'Present').length;
      const absent = updated.filter(s => s.status === 'Absent').length;
      const late = updated.filter(s => s.status === 'Late').length;
      const leave = updated.filter(s => s.status === 'Leave' || s.status === 'Excused').length;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return {
        ...prev,
        students: updated,
        summary: { total_enrolled: total, present, absent, late, leave, attendance_rate: rate }
      };
    });
  };

  // Change single student remarks
  const handleStudentRemarksChange = (studentId, newRemarks) => {
    setStudentRosterData(prev => ({
      ...prev,
      students: prev.students.map(s => s.student_id === studentId ? { ...s, remarks: newRemarks } : s)
    }));
  };

  // Save student attendance (Bulk Upsert)
  const handleSaveStudentAttendance = async () => {
    if (!activeClassroom?.id) return;

    setStudentSaving(true);
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const payload = {
        class_id: activeClassroom.id,
        date: studentDate,
        records: studentRosterData.students.map(s => ({
          student_id: s.student_id,
          status: s.status,
          remarks: s.remarks || null
        }))
      };

      const res = await fetch(`${backendBase}/attendance/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to save student attendance.');
      }

      showToast(`Saved attendance for ${studentRosterData.students.length} students in ${studentClassName}-${studentSection}!`, 'success');
      await fetchStudentRoster();
      if (refreshData) refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setStudentSaving(false);
    }
  };

  // Export Student Attendance to Excel
  const handleExportStudentExcel = () => {
    try {
      const data = filteredStudentList.map(s => ({
        'Admission Number': s.admission_number,
        'Roll Number': s.roll_number,
        'Student Name': s.name,
        'Class': studentClassName,
        'Section': studentSection,
        'Date': studentDate,
        'Attendance Status': s.status,
        'Remarks': s.remarks || 'None'
      }));

      const filename = `Class_Attendance_${studentClassName.replace(/\s+/g, '_')}_Sec${studentSection}_${studentDate}.xlsx`;
      exportToExcel(data, filename, 'Student_Attendance');
      showToast(`Exported ${data.length} student records to Excel!`, 'success');
    } catch (err) {
      showToast(`Failed to export: ${err.message}`, 'error');
    }
  };

  // Filtered Student List
  const filteredStudentList = (studentRosterData.students || []).filter((s) => {
    if (studentFilterStatus !== 'All' && s.status !== studentFilterStatus) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden space-y-6">
      {/* Main Tab Navigation */}
      <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-bold mb-1">
              <Calendar className="w-3.5 h-3.5 text-blue-700" />
              <span>{isTeacher ? 'Teacher Attendance Register' : 'Admin Attendance Management'}</span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {isTeacher ? 'Classroom Student Attendance Register' : 'Institutional Attendance Dashboard'}
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {isTeacher
                ? 'Mark, correct, and update daily attendance and remarks for students enrolled in your assigned classes.'
                : 'Review and record daily attendance separately for academic faculty and classroom student rosters.'}
            </p>
          </div>

          {/* Tab Selector Buttons */}
          {!isTeacher && (
            <div className="flex items-center space-x-2 bg-slate-200/80 p-1 rounded-2xl border border-slate-300 self-start sm:self-auto">
              <button
                onClick={() => setMainTab('teacher')}
                className={`flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  mainTab === 'teacher'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4 text-blue-600" />
                <span>Tab A: Teacher Attendance</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-bold">
                  {teachers.length}
                </span>
              </button>

              <button
                onClick={() => setMainTab('student')}
                className={`flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  mainTab === 'student'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>Tab B: Class Student Attendance</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* TAB A: TEACHER ATTENDANCE VIEW                                          */}
      {/* ======================================================================= */}
      {mainTab === 'teacher' && (
        <div className="p-4 sm:p-6 space-y-6 pt-0">
          {/* Filter Bar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Attendance Date
              </label>
              <input
                type="date"
                value={teacherDate}
                onChange={(e) => setTeacherDate(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Filter by Teacher
              </label>
              <select
                value={teacherFilterId}
                onChange={(e) => setTeacherFilterId(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">All Teachers ({teachers.length})</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.department})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Filter by Status
              </label>
              <select
                value={teacherFilterStatus}
                onChange={(e) => setTeacherFilterStatus(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Leave">Leave</option>
              </select>
            </div>

            <div className="flex items-end space-x-2">
              <button
                onClick={handleMarkAllTeachersPresent}
                className="w-1/2 py-2 px-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center space-x-1"
                title="Mark all teachers as Present"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>All Present</span>
              </button>

              <button
                onClick={handleSaveTeacherAttendance}
                disabled={teacherSaving}
                className="w-1/2 py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center space-x-1"
              >
                {teacherSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Teacher Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Total Faculty</span>
              <p className="text-lg font-black text-slate-900 mt-0.5">{teacherStats.total}</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Present</span>
              <p className="text-lg font-black text-emerald-700 mt-0.5">{teacherStats.present}</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
              <span className="text-[10px] font-bold text-rose-800 uppercase">Absent</span>
              <p className="text-lg font-black text-rose-700 mt-0.5">{teacherStats.absent}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-amber-800 uppercase">Late</span>
              <p className="text-lg font-black text-amber-700 mt-0.5">{teacherStats.late}</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
              <span className="text-[10px] font-bold text-indigo-800 uppercase">Leave</span>
              <p className="text-lg font-black text-indigo-700 mt-0.5">{teacherStats.leave}</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-[10px] font-bold text-blue-800 uppercase">Faculty Rate</span>
              <p className="text-lg font-black text-blue-700 mt-0.5">{teacherStats.rate}%</p>
            </div>
          </div>

          {/* Teacher Table */}
          <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Teacher Attendance Roster ({filteredTeacherList.length} Faculty Members) &bull; {teacherDate}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print</span>
                </button>
                <button
                  onClick={handleExportTeacherExcel}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center space-x-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Teacher ID</th>
                    <th className="py-3 px-4">Faculty Name</th>
                    <th className="py-3 px-4">Department / Subject</th>
                    <th className="py-3 px-4">Attendance Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {teacherLoading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        <span>Loading teacher attendance...</span>
                      </td>
                    </tr>
                  ) : filteredTeacherList.length > 0 ? (
                    filteredTeacherList.map((t) => (
                      <tr key={t.teacher_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {t.employee_id}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {t.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="font-semibold">{t.department}</span>
                          <span className="text-[11px] text-slate-400 block">{t.subject}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center space-x-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                            {['Present', 'Absent', 'Late', 'Leave'].map((statusOpt) => {
                              const isSelected = t.status === statusOpt;
                              const colorMap = {
                                Present: isSelected ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-emerald-700',
                                Absent: isSelected ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-rose-700',
                                Late: isSelected ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-amber-700',
                                Leave: isSelected ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-indigo-700'
                              };
                              return (
                                <button
                                  key={statusOpt}
                                  type="button"
                                  onClick={() => handleTeacherStatusChange(t.teacher_id, statusOpt)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${colorMap[statusOpt]}`}
                                >
                                  {statusOpt}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Optional remarks..."
                            value={t.remarks}
                            onChange={(e) => handleTeacherRemarksChange(t.teacher_id, e.target.value)}
                            className="w-full max-w-xs px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        No teachers match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB B: CLASS STUDENT ATTENDANCE VIEW                                    */}
      {/* ======================================================================= */}
      {mainTab === 'student' && (
        <div className="p-4 sm:p-6 space-y-6 pt-0">
          {/* Class, Section, and Date Selection Bar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {/* 1. Class Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                1. Select Class
              </label>
              <select
                value={studentClassName}
                onChange={(e) => setStudentClassName(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 focus:ring-2 focus:ring-blue-600"
              >
                {availableClassNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* 2. Section Selection */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                2. Select Section
              </label>
              <select
                value={studentSection}
                onChange={(e) => setStudentSection(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-white font-bold text-blue-700 focus:ring-2 focus:ring-blue-600"
              >
                {availableSections.map(sec => (
                  <option key={sec} value={sec}>Section {sec}</option>
                ))}
              </select>
            </div>

            {/* 3. Attendance Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                3. Attendance Date
              </label>
              <input
                type="date"
                value={studentDate}
                onChange={(e) => setStudentDate(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                Filter by Status
              </label>
              <select
                value={studentFilterStatus}
                onChange={(e) => setStudentFilterStatus(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-blue-600"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
                <option value="Leave">Leave</option>
              </select>
            </div>

            {/* Quick Actions */}
            <div className="flex items-end space-x-2">
              <button
                onClick={handleMarkAllStudentsPresent}
                className="w-1/2 py-2 px-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center space-x-1"
                title="Mark all students Present"
              >
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>All Present</span>
              </button>

              <button
                onClick={handleSaveStudentAttendance}
                disabled={studentSaving}
                className="w-1/2 py-2 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center space-x-1"
              >
                {studentSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Roster</span>
              </button>
            </div>
          </div>

          {/* Student Class Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Enrolled Students</span>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                {studentRosterData.summary?.total_enrolled || 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">Present</span>
              <p className="text-lg font-black text-emerald-700 mt-0.5">
                {studentRosterData.summary?.present || 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
              <span className="text-[10px] font-bold text-rose-800 uppercase">Absent</span>
              <p className="text-lg font-black text-rose-700 mt-0.5">
                {studentRosterData.summary?.absent || 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-[10px] font-bold text-amber-800 uppercase">Late</span>
              <p className="text-lg font-black text-amber-700 mt-0.5">
                {studentRosterData.summary?.late || 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
              <span className="text-[10px] font-bold text-indigo-800 uppercase">Leave</span>
              <p className="text-lg font-black text-indigo-700 mt-0.5">
                {studentRosterData.summary?.leave || 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-[10px] font-bold text-blue-800 uppercase">Attendance Rate</span>
              <p className="text-lg font-black text-blue-700 mt-0.5">
                {studentRosterData.summary?.attendance_rate || 0}%
              </p>
            </div>
          </div>

          {/* Student Table */}
          <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">
                  {studentClassName} — Section {studentSection} &bull; {filteredStudentList.length} Students Enrolled &bull; {studentDate}
                </span>
                <span className="block text-[11px] text-slate-500 font-medium">
                  Class Code: {activeClassroom?.class_code} &bull; Room: {activeClassroom?.room || 'N/A'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Sheet</span>
                </button>
                <button
                  onClick={handleExportStudentExcel}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center space-x-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Admission No</th>
                    <th className="py-3 px-4">Roll No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Attendance Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {studentLoading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                        <span>Loading class roster and attendance records...</span>
                      </td>
                    </tr>
                  ) : filteredStudentList.length > 0 ? (
                    filteredStudentList.map((s) => (
                      <tr key={s.student_id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {s.admission_number}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 font-semibold">
                          {s.roll_number}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {s.name}
                        </td>
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center space-x-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                            {['Present', 'Absent', 'Late', 'Leave'].map((statusOpt) => {
                              const isSelected = s.status === statusOpt || (statusOpt === 'Leave' && s.status === 'Excused');
                              const colorMap = {
                                Present: isSelected ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-emerald-700',
                                Absent: isSelected ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-rose-700',
                                Late: isSelected ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-amber-700',
                                Leave: isSelected ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-indigo-700'
                              };
                              return (
                                <button
                                  key={statusOpt}
                                  type="button"
                                  onClick={() => handleStudentStatusChange(s.student_id, statusOpt)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${colorMap[statusOpt]}`}
                                >
                                  {statusOpt}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Optional remarks..."
                            value={s.remarks || ''}
                            onChange={(e) => handleStudentRemarksChange(s.student_id, e.target.value)}
                            className="w-full max-w-xs px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        No students enrolled in {studentClassName} - Section {studentSection} matching the filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

