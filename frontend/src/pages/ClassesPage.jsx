import React, { useState, useMemo } from 'react';
import {
  School,
  PlusCircle,
  Users,
  Clock,
  FileSpreadsheet,
  Award,
  CalendarCheck2,
  CalendarDays,
  FileText,
  UserPlus,
  Loader2,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import AddClassModal from '../components/forms/AddClassModal';
import AddStudentModal from '../components/forms/AddStudentModal';
import Modal from '../components/common/Modal';
import FacultyAssignmentsManager from '../components/classes/FacultyAssignmentsManager';
import { isUserAdmin, isUserTeacher, isClassAssignedToTeacher } from '../utils/permissions';
import { exportToExcel } from '../utils/excelExport';
import { getApiBaseUrl } from '../config/api';

export default function ClassesPage() {
  const { classes, showToast, currentUser, currentTeacher, teacherAssignments, authToken, setCurrentPage } = useApp();
  const isAdmin = isUserAdmin(currentUser);
  const isTeacher = isUserTeacher(currentUser);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('All');
  const [adminTab, setAdminTab] = useState('sections'); // 'sections' | 'allocations'

  // Class Roster & Management Modal State
  const [rosterClass, setRosterClass] = useState(null);
  const [rosterStudents, setRosterStudents] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [isAddStudentForClassOpen, setIsAddStudentForClassOpen] = useState(false);

  const handleOpenRoster = async (cls) => {
    setRosterClass(cls);
    setRosterLoading(true);
    try {
      const backendBase = getApiBaseUrl();
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const res = await fetch(`${backendBase}/classes/${cls.id}/students`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setRosterStudents(await res.json());
      } else {
        setRosterStudents([]);
      }
    } catch (err) {
      showToast('Failed to load class roster', 'error');
      setRosterStudents([]);
    } finally {
      setRosterLoading(false);
    }
  };

  // Filter classes strictly assigned to authenticated teacher
  const assignedClasses = useMemo(() => {
    if (!isTeacher) return [];

    return classes.filter((c) => {
      // 1. Check teacherAssignments (mentorship & teaching assignments from backend)
      if (isClassAssignedToTeacher(c.id, teacherAssignments, currentTeacher)) {
        return true;
      }

      // 2. Match by linked teacher ID
      const matchTeacherId = currentTeacher?.id && (
        c.class_teacher_id === currentTeacher.id ||
        c.classTeacherId === currentTeacher.id ||
        String(c.class_teacher_id) === String(currentTeacher.id) ||
        String(c.classTeacherId) === String(currentTeacher.id)
      );

      // 3. Match by user ID
      const matchUserId = currentUser?.id && (
        c.class_teacher_id === currentUser.id ||
        c.userId === currentUser.id ||
        String(c.class_teacher_id) === String(currentUser.id)
      );

      // 4. Match by teacher name (case-insensitive)
      const currentTeacherName = (currentUser?.name || currentTeacher?.name || '').trim().toLowerCase();
      const assignedAdvisor = (c.classTeacher || c.class_teacher || '').trim().toLowerCase();
      const matchName = Boolean(currentTeacherName && assignedAdvisor && currentTeacherName === assignedAdvisor);

      return Boolean(matchTeacherId || matchUserId || matchName);
    });
  }, [isTeacher, classes, teacherAssignments, currentTeacher, currentUser]);

  // Display only teacher's assigned classes if teacher; all classes if admin/other
  const displayClasses = isTeacher ? assignedClasses : classes;

  // Grade filter options
  const gradeOptions = useMemo(() => {
    if (isTeacher) {
      const teacherGrades = Array.from(new Set(assignedClasses.map((c) => c.name))).filter(Boolean);
      return teacherGrades.length > 1 ? ['All', ...teacherGrades] : [];
    }
    return ['All', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  }, [isTeacher, assignedClasses]);

  const filteredClasses = displayClasses.filter((c) => {
    if (selectedGradeFilter === 'All') return true;
    return c.name === selectedGradeFilter;
  });

  const handleExportExcel = () => {
    try {
      const formattedData = filteredClasses.map((cls) => {
        const occupancyRate = Math.min(100, Math.round((cls.totalStudents / cls.capacity) * 100));
        return {
          'Class ID': cls.id,
          'Class': cls.name,
          'Section': cls.section,
          ...(isAdmin ? { 'Class Teacher': cls.classTeacher } : {}),
          'Weekly Schedule': cls.schedule,
          'Enrolled Students': cls.totalStudents,
          'Max Capacity': cls.capacity,
          'Occupancy Rate': `${occupancyRate}%`
        };
      });

      const filename = isTeacher ? 'My_Assigned_Classes.xlsx' : 'Class_List.xlsx';
      exportToExcel(formattedData, filename, 'Classes');
      showToast(`Exported ${filteredClasses.length} class records to Excel!`, 'success');
    } catch (err) {
      showToast(`Failed to export classes: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {isTeacher ? 'My Assigned Classes & Sections' : 'Classes & Sections'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {isTeacher
              ? (assignedClasses.length > 0
                  ? `Your assigned teaching classes and section rosters. Total assigned: ${assignedClasses.length}`
                  : 'Your assigned teaching classes and section rosters.')
              : `Active classroom roster and student enrollment capacity. Total sections: ${classes.length}`
            }
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filteredClasses.length > 0 && (
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors shadow-xs"
              title="Export Class Roster to Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export (.xlsx)</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Class / Section</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin View Switcher: Classrooms vs Faculty Assignments */}
      {isAdmin && (
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
          <button
            onClick={() => setAdminTab('sections')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === 'sections'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <School className="w-4 h-4 text-blue-600" />
            <span>Classroom Sections & Capacity</span>
          </button>

          <button
            onClick={() => setAdminTab('allocations')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              adminTab === 'allocations'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Faculty Mentorship & Subject Allocations</span>
          </button>
        </div>
      )}

      {isAdmin && adminTab === 'allocations' ? (
        <FacultyAssignmentsManager />
      ) : (
        <>
          {/* Grade Selector Pills */}
          {gradeOptions.length > 1 && (
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {gradeOptions.map((grade) => (
                <button
                  key={grade}
                  onClick={() => setSelectedGradeFilter(grade)}
                  className={`px-3.5 sm:px-4 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedGradeFilter === grade
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {isTeacher && assignedClasses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 border border-blue-100">
                <School className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                No classes or sections assigned yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your assigned classes and section rosters will appear here once allocated by the school administration.
              </p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-200">
                <School className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                No classes found for this filter
              </h3>
              <p className="text-xs text-slate-500">
                Switch back to &apos;All&apos; to view all configured classroom sections.
              </p>
            </div>
          ) : (
            /* Class Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredClasses.map((cls) => {
                const occupancyRate = Math.min(100, Math.round((cls.totalStudents / cls.capacity) * 100));
                const isNearFull = occupancyRate >= 90;

                return (
                  <div
                    key={cls.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all p-4 sm:p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            {cls.id}
                          </span>
                          <h3 className="text-base font-black text-slate-900 mt-2">
                            {cls.name} <span className="text-blue-600">({cls.section})</span>
                          </h3>
                        </div>
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                          <School className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Class & Section Details */}
                      <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Class:</span>
                          <strong className="text-slate-900 font-bold">{cls.name}</strong>
                        </div>
                        <div className="flex items-center justify-between text-xs border-t border-slate-200/80 pt-2">
                          <span className="text-slate-500 font-medium">Section:</span>
                          <strong className="text-blue-800 font-bold text-xs bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-md">
                            Section {cls.section}
                          </strong>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2 text-xs">
                        {isAdmin && (
                          <div className="flex items-center text-slate-700">
                            <Users className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                            <span>Mentor / Advisor: <strong className="text-slate-900">{cls.classTeacher}</strong></span>
                          </div>
                        )}

                        <div className="flex items-center text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                          <span className="text-[11px] font-medium">{cls.schedule}</span>
                        </div>
                      </div>

                      {/* Enrolled Students / Capacity Bar */}
                      <div className="mt-5 pt-3.5 border-t border-slate-100">
                        <div className="flex justify-between text-xs font-semibold mb-1.5">
                          <span className="text-slate-700 font-bold">Enrollment Capacity</span>
                          <span className={`font-bold ${isNearFull ? 'text-amber-700' : 'text-blue-700'}`}>
                            {cls.totalStudents} / {cls.capacity} ({occupancyRate}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isNearFull ? 'bg-amber-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${occupancyRate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenRoster(cls)}
                        className="flex-1 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 text-blue-700 text-xs font-bold transition-all text-center"
                      >
                        Manage & Roster
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Class Roster & Management Modal */}
      {rosterClass && (
        <Modal
          isOpen={Boolean(rosterClass)}
          onClose={() => setRosterClass(null)}
          title={`Class Roster: ${rosterClass.name} - Section ${rosterClass.section}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-slate-800">
                  Total Enrolled: <strong className="text-blue-700">{rosterStudents.length}</strong> / {rosterClass.capacity}
                </span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-slate-600">
                  Advisor: <strong className="text-slate-900">{rosterClass.classTeacher || 'Assigned Mentor'}</strong>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsAddStudentForClassOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Enroll Student</span>
                </button>
                <button
                  onClick={() => {
                    setRosterClass(null);
                    setCurrentPage('attendance');
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center space-x-1"
                >
                  <CalendarCheck2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Attendance</span>
                </button>
                <button
                  onClick={() => {
                    setRosterClass(null);
                    setCurrentPage('timetable');
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center space-x-1"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Timetable</span>
                </button>
              </div>
            </div>

            {rosterLoading ? (
              <div className="py-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Loading enrolled student list...</p>
              </div>
            ) : rosterStudents.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No students currently enrolled in this section.</p>
                <button
                  onClick={() => setIsAddStudentForClassOpen(true)}
                  className="mt-3 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center space-x-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Enroll First Student</span>
                </button>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Roll #</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Student ID</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Guardian Phone</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rosterStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-900">{st.roll_number || st.rollNumber || '—'}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{st.name}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{st.student_id || st.studentId || `STU-${st.id}`}</td>
                        <td className="py-2.5 px-3 text-slate-600">{st.email || '—'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{st.guardian_phone || st.guardianPhone || '—'}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {st.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add Student directly to this class */}
      {isAddStudentForClassOpen && rosterClass && (
        <AddStudentModal
          isOpen={isAddStudentForClassOpen}
          onClose={() => {
            setIsAddStudentForClassOpen(false);
            if (rosterClass) handleOpenRoster(rosterClass);
          }}
        />
      )}

      {isAdmin && <AddClassModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />}
    </div>
  );
}
