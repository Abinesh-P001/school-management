import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Clock,
  Printer,
  Calendar,
  FileSpreadsheet,
  Plus,
  Edit2,
  Trash2,
  School,
  User,
  MapPin,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  BookOpen,
  Filter,
  ArrowRight,
  ShieldCheck,
  Award,
  Grid,
  List
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isUserAdmin, isUserTeacher, isUserStudent, canEditTimetable, isClassAssignedToTeacher } from '../utils/permissions';
import { exportToExcel } from '../utils/excelExport';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { getApiBaseUrl } from '../config/api';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ACADEMIC_YEARS = ['2026-2027', '2025-2026', '2024-2025'];

// Preset default period time slots for fast adding
const DEFAULT_PERIOD_TIMES = {
  1: { start: '08:30', end: '09:20' },
  2: { start: '09:25', end: '10:15' },
  3: { start: '10:20', end: '11:10' },
  4: { start: '11:10', end: '11:45', isBreak: true, subject: 'Lunch & Campus Recess' },
  5: { start: '11:45', end: '12:35' },
  6: { start: '12:40', end: '13:30' },
  7: { start: '13:35', end: '14:25' },
  8: { start: '14:30', end: '15:20' }
};

export default function TimetablePage() {
  const {
    authToken,
    classes,
    teachers,
    currentUser,
    currentStudent,
    currentTeacher,
    teacherAssignments,
    showToast
  } = useApp();

  const isAdmin = isUserAdmin(currentUser);
  const isTeacher = isUserTeacher(currentUser);
  const isStudent = isUserStudent(currentUser);

  const backendBase = getApiBaseUrl();

  // Request race-condition guard
  const activeRequestRef = useRef(0);
  const userManuallySwitchedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // FILTER STATES (Declared before authorization & class helpers)
  // ---------------------------------------------------------------------------
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [activeDay, setActiveDay] = useState('Monday');
  const [layoutMode, setLayoutMode] = useState('weekly'); // 'weekly' (Full Grid Matrix) | 'daily' (Daily Timeline)

  // Teacher View Mode: 'teaching' (my teaching schedule) | 'class' (class browser) | 'mentored' (my mentored class)
  const [teacherViewMode, setTeacherViewMode] = useState(isTeacher ? 'teaching' : 'class');

  // Class Selection
  const [selectedClassId, setSelectedClassId] = useState(() => {
    if (classes && classes.length > 0) return classes[0].id;
    return null;
  });

  // Automatically ensure teacher lands on their assigned teaching timetable
  useEffect(() => {
    if (isTeacher && !userManuallySwitchedRef.current) {
      setTeacherViewMode('teaching');
    }
  }, [isTeacher]);

  // Scoped classes for teacher
  const displayClasses = useMemo(() => {
    if (!isTeacher) return classes;
    const assigned = classes.filter(c => isClassAssignedToTeacher(c.id, teacherAssignments, currentTeacher));
    return assigned.length > 0 ? assigned : classes;
  }, [classes, isTeacher, teacherAssignments, currentTeacher]);

  const canEditCurrentClass = isAdmin || canEditTimetable(currentUser, selectedClassId, teacherAssignments);
  const canEditSlot = (slot) => isAdmin || canEditTimetable(currentUser, slot?.class_id || selectedClassId, teacherAssignments);
  const canAddAnyPeriod = isAdmin || (isTeacher && displayClasses.length > 0) || canEditCurrentClass;

  // Timetable Data States
  const [timetableData, setTimetableData] = useState(null);
  const [teacherTimetableData, setTeacherTimetableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [modalClassId, setModalClassId] = useState('');
  const [formData, setFormData] = useState({
    day_of_week: 'Monday',
    period_number: 1,
    start_time: '08:30',
    end_time: '09:20',
    subject: '',
    teacher_id: '',
    room: '',
    is_break: false
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Confirmation Modal State
  const [deleteTargetSlot, setDeleteTargetSlot] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Sync initial class ID when classes load
  useEffect(() => {
    if (displayClasses && displayClasses.length > 0) {
      if (!selectedClassId || !displayClasses.some(c => c.id === Number(selectedClassId))) {
        if (isStudent && currentStudent?.class_id) {
          setSelectedClassId(currentStudent.class_id);
        } else if (isTeacher && teacherAssignments?.mentorship_class) {
          setSelectedClassId(teacherAssignments.mentorship_class.class_id);
        } else {
          setSelectedClassId(displayClasses[0].id);
        }
      }
    }
  }, [displayClasses, selectedClassId, isStudent, isTeacher, teacherAssignments, currentStudent]);

  // Find currently selected classroom object
  const currentClassroom = useMemo(() => {
    if (!classes || classes.length === 0) return null;
    return classes.find(c => c.id === Number(selectedClassId)) || classes[0];
  }, [classes, selectedClassId]);

  // Extract distinct grades and available sections
  const distinctGrades = useMemo(() => {
    const grades = [...new Set(classes.map(c => c.name))];
    return grades.length > 0 ? grades : ['Class 1', 'Class 2', 'Class 3', 'Class 6', 'Class 7', 'Class 8', 'Grade 10', 'Grade 11', 'Grade 12'];
  }, [classes]);

  const currentGrade = currentClassroom?.name || distinctGrades[0];
  const availableSectionsForGrade = useMemo(() => {
    return classes.filter(c => c.name === currentGrade);
  }, [classes, currentGrade]);

  // ---------------------------------------------------------------------------
  // API FETCH: FETCH TIMETABLE DATA (WITH RACE-CONDITION CANCELLATION)
  // ---------------------------------------------------------------------------
  const fetchClassTimetable = useCallback(async (classId, year) => {
    if (!classId) return;
    const reqId = ++activeRequestRef.current;

    setLoading(true);
    setError(null);
    // Clear stale data immediately so previous class schedule is never shown during loading
    setTimetableData(null);

    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      let endpoint = `${backendBase}/timetable?academic_year=${encodeURIComponent(year)}&class_id=${classId}`;
      if (isStudent) {
        endpoint = `${backendBase}/timetable/student?academic_year=${encodeURIComponent(year)}`;
      }

      const res = await fetch(endpoint, { headers });
      if (reqId !== activeRequestRef.current) return; // Stale request discarded

      if (!res.ok) {
        if (res.status === 404) {
          // Empty state: no timetable created for this class/section
          setTimetableData({
            academic_year: year,
            class_id: classId,
            class_name: currentClassroom?.name || 'Class',
            section: currentClassroom?.section || 'A',
            days: WEEKDAYS,
            time_slots: [],
            grid: { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] },
            total_periods: 0
          });
          return;
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to load timetable.');
      }

      const data = await res.json();
      if (reqId !== activeRequestRef.current) return; // Stale request discarded
      setTimetableData(data);
    } catch (err) {
      if (reqId !== activeRequestRef.current) return;
      console.error('Error fetching timetable:', err);
      setError(err.message);
    } finally {
      if (reqId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  }, [authToken, backendBase, isStudent, currentClassroom]);

  const fetchTeacherTimetable = useCallback(async (year) => {
    const reqId = ++activeRequestRef.current;
    setLoading(true);
    setError(null);
    setTeacherTimetableData(null);

    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${backendBase}/timetable/teacher?academic_year=${encodeURIComponent(year)}`, { headers });
      if (reqId !== activeRequestRef.current) return;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to load teacher teaching schedule.');
      }
      const data = await res.json();
      if (reqId !== activeRequestRef.current) return;
      setTeacherTimetableData(data);
    } catch (err) {
      if (reqId !== activeRequestRef.current) return;
      console.error('Error fetching teacher timetable:', err);
      setError(err.message);
    } finally {
      if (reqId === activeRequestRef.current) {
        setLoading(false);
      }
    }
  }, [authToken, backendBase]);

  // Main data loader effect
  useEffect(() => {
    if (isTeacher && teacherViewMode === 'teaching') {
      fetchTeacherTimetable(academicYear);
    } else if (selectedClassId) {
      fetchClassTimetable(selectedClassId, academicYear);
    }
  }, [academicYear, selectedClassId, teacherViewMode, isTeacher, fetchClassTimetable, fetchTeacherTimetable]);

  // ---------------------------------------------------------------------------
  // MODAL ACTIONS: ADD / EDIT PERIOD
  // ---------------------------------------------------------------------------
  const handleOpenAddModal = (presetDay = null, presetPeriod = null) => {
    setEditingSlot(null);
    setFormError('');
    const targetPeriod = presetPeriod || 1;
    const preset = DEFAULT_PERIOD_TIMES[targetPeriod] || { start: '08:30', end: '09:20' };
    const defaultCls = displayClasses.find(c => c.id === Number(selectedClassId)) || displayClasses[0] || classes[0];
    setModalClassId(defaultCls?.id ? String(defaultCls.id) : '');

    setFormData({
      day_of_week: presetDay || activeDay,
      period_number: targetPeriod,
      start_time: preset.start,
      end_time: preset.end,
      subject: '',
      teacher_id: teachers.length > 0 ? String(teachers[0].id) : '',
      room: defaultCls?.room || 'Room 101',
      is_break: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (slot) => {
    setEditingSlot(slot);
    setFormError('');
    setFormData({
      day_of_week: slot.day_of_week,
      period_number: slot.period_number,
      start_time: slot.start_time,
      end_time: slot.end_time,
      subject: slot.subject,
      teacher_id: slot.teacher_id ? String(slot.teacher_id) : '',
      room: slot.room || '',
      is_break: slot.is_break
    });
    setIsModalOpen(true);
  };

  const handlePeriodNumberChange = (num) => {
    const pNum = Number(num);
    const preset = DEFAULT_PERIOD_TIMES[pNum];
    setFormData(prev => ({
      ...prev,
      period_number: pNum,
      start_time: preset ? preset.start : prev.start_time,
      end_time: preset ? preset.end : prev.end_time,
      is_break: preset?.isBreak || false,
      subject: preset?.subject ? preset.subject : (prev.is_break ? '' : prev.subject)
    }));
  };

  const handleSavePeriod = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (formData.end_time <= formData.start_time) {
      setFormError(`End time (${formData.end_time}) must be strictly after start time (${formData.start_time}).`);
      return;
    }

    if (!formData.subject.trim()) {
      setFormError('Please enter a subject name or break description.');
      return;
    }

    setFormSubmitting(true);
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      };

      const effectiveClassId = editingSlot ? Number(selectedClassId) : Number(modalClassId || selectedClassId);
      const effectiveClass = classes.find(c => c.id === effectiveClassId) || currentClassroom;

      const payload = {
        academic_year: academicYear,
        class_id: effectiveClassId,
        section: effectiveClass?.section || 'A',
        day_of_week: formData.day_of_week,
        period_number: Number(formData.period_number),
        start_time: formData.start_time,
        end_time: formData.end_time,
        subject: formData.subject.trim(),
        teacher_id: formData.is_break || !formData.teacher_id ? null : Number(formData.teacher_id),
        room: formData.room.trim() || effectiveClass?.room || null,
        is_break: Boolean(formData.is_break)
      };

      let res;
      if (editingSlot) {
        res = await fetch(`${backendBase}/timetable/${editingSlot.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${backendBase}/timetable/`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to save timetable period.');
      }

      showToast(
        editingSlot
          ? `Updated Period ${formData.period_number} for ${currentClassroom?.name}-${currentClassroom?.section} successfully!`
          : `Added Period ${formData.period_number} to ${currentClassroom?.name}-${currentClassroom?.section}!`,
        'success'
      );

      setIsModalOpen(false);
      // Refresh current class & teacher schedule
      await Promise.all([
        fetchClassTimetable(selectedClassId, academicYear),
        isTeacher ? fetchTeacherTimetable(academicYear) : Promise.resolve()
      ]);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // DELETE PERIOD ACTION
  // ---------------------------------------------------------------------------
  const handleConfirmDelete = async () => {
    if (!deleteTargetSlot) return;
    setDeleting(true);

    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const res = await fetch(`${backendBase}/timetable/${deleteTargetSlot.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || 'Failed to delete period.');
      }

      showToast(
        `Period ${deleteTargetSlot.period_number} (${deleteTargetSlot.subject}) deleted. Other classes remain intact.`,
        'info'
      );
      setDeleteTargetSlot(null);
      await Promise.all([
        fetchClassTimetable(selectedClassId, academicYear),
        isTeacher ? fetchTeacherTimetable(academicYear) : Promise.resolve()
      ]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // EXPORT TO EXCEL
  // ---------------------------------------------------------------------------
  const handleExportExcel = () => {
    try {
      const rows = [];

      if (isTeacher && teacherViewMode === 'teaching') {
        const grid = teacherTimetableData?.grid || {};
        WEEKDAYS.forEach(day => {
          (grid[day] || []).forEach(slot => {
            rows.push({
              'Academic Year': academicYear,
              'Day': day,
              'Period Number': slot.period_number,
              'Time Slot': `${slot.start_time} - ${slot.end_time}`,
              'Class / Grade': slot.class_name,
              'Section': slot.section,
              'Subject': slot.subject,
              'Teacher': slot.teacher_name || 'Self',
              'Room / Facility': slot.room || 'Standard Room',
              'Type': slot.is_break ? 'Recess / Lunch' : 'Instructional Period'
            });
          });
        });
        exportToExcel(
          rows,
          `Faculty_Schedule_${(currentUser?.name || 'Teacher').replace(/[^a-zA-Z0-9]/g, '_')}_${academicYear}.xlsx`,
          'Faculty_Schedule'
        );
      } else {
        const grid = timetableData?.grid || {};
        WEEKDAYS.forEach(day => {
          (grid[day] || []).forEach(slot => {
            rows.push({
              'Academic Year': academicYear,
              'Day': day,
              'Period Number': slot.period_number,
              'Time Slot': `${slot.start_time} - ${slot.end_time}`,
              'Class': currentClassroom?.name || slot.class_name,
              'Section': currentClassroom?.section || slot.section,
              'Subject': slot.subject,
              'Teacher': slot.is_break ? 'N/A' : (slot.teacher_name || 'Unassigned'),
              'Teacher Email': slot.teacher_email || 'N/A',
              'Room': slot.room || 'General Room',
              'Type': slot.is_break ? 'Recess / Lunch' : 'Instructional Period'
            });
          });
        });

        const safeClassName = `${currentClassroom?.name || 'Class'}_Sec_${currentClassroom?.section || 'A'}`.replace(/[^a-zA-Z0-9]/g, '_');
        exportToExcel(
          rows,
          `Timetable_${safeClassName}_${academicYear}.xlsx`,
          'Class_Timetable'
        );
      }

      showToast(`Exported timetable report to Microsoft Excel (.xlsx)!`, 'success');
    } catch (err) {
      showToast(`Export failed: ${err.message}`, 'error');
    }
  };

  // Active periods for current day
  const displayedDailyPeriods = useMemo(() => {
    if (isTeacher && teacherViewMode === 'teaching') {
      return teacherTimetableData?.grid?.[activeDay] || [];
    }
    return timetableData?.grid?.[activeDay] || [];
  }, [isTeacher, teacherViewMode, teacherTimetableData, timetableData, activeDay]);

  // Derived periods for Full Weekly Matrix
  const activeGrid = useMemo(() => {
    if (isTeacher && teacherViewMode === 'teaching') {
      return teacherTimetableData?.grid || {};
    }
    return timetableData?.grid || {};
  }, [isTeacher, teacherViewMode, teacherTimetableData, timetableData]);

  // Extract all unique period slots present in this timetable
  const uniquePeriodSlots = useMemo(() => {
    const slotsMap = new Map();
    Object.values(activeGrid).forEach(dayList => {
      (dayList || []).forEach(slot => {
        if (!slotsMap.has(slot.period_number)) {
          slotsMap.set(slot.period_number, {
            period_number: slot.period_number,
            start_time: slot.start_time,
            end_time: slot.end_time,
            is_break: slot.is_break
          });
        }
      });
    });

    const arr = Array.from(slotsMap.values()).sort((a, b) => a.period_number - b.period_number);
    if (arr.length > 0) return arr;
    // Fallback default periods
    return [
      { period_number: 1, start_time: '08:30', end_time: '09:20' },
      { period_number: 2, start_time: '09:25', end_time: '10:15' },
      { period_number: 3, start_time: '10:20', end_time: '11:10' },
      { period_number: 4, start_time: '11:10', end_time: '11:45', is_break: true },
      { period_number: 5, start_time: '11:45', end_time: '12:35' },
    ];
  }, [activeGrid]);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          1. HEADER CONTROLS (Print, Export, Role Indicators)
          ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-300 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-bold mb-2">
            <Calendar className="w-3.5 h-3.5 text-blue-700" />
            <span>Master Academic Scheduling Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Institutional Class Timetable
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Separate, independent instructional timetables per grade and section.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layout Mode Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-300">
            <button
              onClick={() => setLayoutMode('weekly')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                layoutMode === 'weekly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
              title="Full Weekly Grid Matrix"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Weekly Grid</span>
            </button>
            <button
              onClick={() => setLayoutMode('daily')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                layoutMode === 'daily'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
              title="Daily Detailed Timeline"
            >
              <List className="w-3.5 h-3.5" />
              <span>Daily Timeline</span>
            </button>
          </div>

          {/* Print Button */}
          <button
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-xs"
            title="Print printable timetable sheet"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print Schedule</span>
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors shadow-xs"
            title="Export Timetable to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export to Excel</span>
          </button>

          {/* Add Period Button (Admin or Authorized Faculty) */}
          {(canAddAnyPeriod) && (
            <button
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Period</span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          2. ROLE-BASED TOGGLES (Teacher Mode & Student Enrolled Class Banner)
          ===================================================================== */}
      {isTeacher && (
        <div className="bg-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-300">
          <button
            onClick={() => setTeacherViewMode('teaching')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              teacherViewMode === 'teaching'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            My Teaching Periods ({teacherTimetableData?.total_assigned_periods ?? '...'})
          </button>

          {teacherAssignments?.mentorship_class && (
            <button
              onClick={() => {
                setTeacherViewMode('mentored');
                setSelectedClassId(teacherAssignments.mentorship_class.class_id);
              }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                teacherViewMode === 'mentored'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-white/80'
              }`}
            >
              My Mentored Class ({teacherAssignments.mentorship_class.name} - Sec {teacherAssignments.mentorship_class.section})
            </button>
          )}

          <button
            onClick={() => setTeacherViewMode('class')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              teacherViewMode === 'class'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-white/80'
            }`}
          >
            Browse Other Class Timetables
          </button>
        </div>
      )}

      {isStudent && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              🎓
            </div>
            <div>
              <h4 className="text-xs font-bold text-blue-950">
                Official Roster: {timetableData?.class_name || currentStudent?.grade || 'Class'} &mdash; Section {timetableData?.section || currentStudent?.section || 'A'}
              </h4>
              <p className="text-[11px] text-blue-800 font-medium">
                Student ID: <span className="font-mono font-bold">{currentStudent?.id || 'STU-Current'}</span> &bull; Academic Year: {academicYear}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white text-blue-900 border border-blue-300">
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-600" />
            Verified Class Enrolled
          </span>
        </div>
      )}

      {/* =====================================================================
          3. SELECTORS BAR (Academic Year, Class/Grade, Section)
          ===================================================================== */}
      {(!isTeacher || teacherViewMode !== 'teaching') && !isStudent && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-300 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Academic Year Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              1. Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            >
              {ACADEMIC_YEARS.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Class / Grade Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              2. Class / Grade
            </label>
            <select
              value={currentGrade}
              onChange={(e) => {
                const newGrade = e.target.value;
                const matchClass = classes.find(c => c.name === newGrade);
                if (matchClass) {
                  setSelectedClassId(matchClass.id);
                }
              }}
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            >
              {distinctGrades.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              3. Section
            </label>
            <select
              value={selectedClassId || ''}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            >
              {availableSectionsForGrade.map(cls => (
                <option key={cls.id} value={cls.id}>
                  Section {cls.section} &mdash; ({cls.room || 'Room N/A'})
                </option>
              ))}
            </select>
          </div>

          {/* Selected Class Summary Pill */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Active Classroom</span>
              <p className="text-xs font-black text-slate-900">
                {currentClassroom?.name} - Sec {currentClassroom?.section}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {currentClassroom?.classCode || `CLS-${currentClassroom?.id}`}
            </span>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. LAYOUT VIEW A: FULL WEEKLY TIMETABLE GRID MATRIX
          ===================================================================== */}
      {layoutMode === 'weekly' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2 mb-4">
            <div className="flex items-center space-x-2">
              <Grid className="w-4 h-4 text-blue-600 shrink-0" />
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                {isTeacher && teacherViewMode === 'teaching' ? (
                  <>Weekly Teaching Master Matrix &bull; {currentUser?.name}</>
                ) : (
                  <>Weekly Schedule Matrix &bull; {currentClassroom?.name || timetableData?.class_name} &mdash; Section {currentClassroom?.section || timetableData?.section}</>
                )}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-600">
              Academic Session: <strong className="text-slate-900">{academicYear}</strong>
            </span>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs font-bold text-slate-600">
                Loading {currentClassroom?.name || 'Class'} timetable for {academicYear}...
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="my-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Failed to load timetable</p>
                <p className="mt-0.5 text-rose-700">{error}</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && Object.values(activeGrid).every(list => !list || list.length === 0) && (
            <div className="py-16 text-center max-w-md mx-auto">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                <Calendar className="w-7 h-7" />
              </div>
              {isTeacher && teacherViewMode === 'teaching' ? (
                <>
                  <h4 className="text-sm font-black text-slate-900">
                    No Teaching Periods Assigned
                  </h4>
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    You do not currently have any instructional periods scheduled for academic year{' '}
                    <span className="font-bold text-slate-900">{academicYear}</span>. If your schedule has not yet been populated, please contact your academic administrator.
                  </p>
                </>
              ) : (
                <>
                  <h4 className="text-sm font-black text-slate-900">
                    No timetable has been created for this class and section
                  </h4>
                  <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                    No schedule records exist for{' '}
                    <span className="font-bold text-slate-900">{currentClassroom?.name} - Section {currentClassroom?.section}</span> in{' '}
                    <span className="font-bold text-slate-900">{academicYear}</span>.
                  </p>
                  {(isAdmin || canEditCurrentClass) && (
                    <button
                      onClick={() => handleOpenAddModal('Monday', 1)}
                      className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Create First Period (Period 1)</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Weekly Matrix Table */}
          {!loading && !error && Object.values(activeGrid).some(list => list && list.length > 0) && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-3 font-extrabold text-slate-800 text-left min-w-[120px] uppercase tracking-wider">
                      Period / Time
                    </th>
                    {WEEKDAYS.map(day => (
                      <th key={day} className="p-3 font-extrabold text-slate-800 text-center min-w-[160px] uppercase tracking-wider">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {uniquePeriodSlots.map((pSlot) => (
                    <tr key={pSlot.period_number} className="hover:bg-slate-50/60 transition-colors">
                      {/* Period Label Cell */}
                      <td className="p-3 font-bold bg-slate-50/80 border-r border-slate-200 align-top">
                        <span className="block text-slate-900 font-extrabold">
                          {pSlot.is_break ? 'Recess / Lunch' : `Period ${pSlot.period_number}`}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 block mt-0.5">
                          {pSlot.start_time} - {pSlot.end_time}
                        </span>
                      </td>

                      {/* Day Cells */}
                      {WEEKDAYS.map(day => {
                        const daySlots = activeGrid[day] || [];
                        const slot = daySlots.find(s => s.period_number === pSlot.period_number);

                        if (!slot) {
                          return (
                            <td key={day} className="p-2.5 text-center border-r border-slate-200 align-middle">
                              {isTeacher && teacherViewMode === 'teaching' ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-slate-300">
                                  &mdash;
                                </span>
                              ) : (isAdmin || canEditCurrentClass) ? (
                                <button
                                  onClick={() => handleOpenAddModal(day, pSlot.period_number)}
                                  className="w-full py-2 border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-blue-700 transition-all flex items-center justify-center space-x-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add</span>
                                </button>
                              ) : (
                                <span className="text-slate-300 font-mono text-xs">&mdash;</span>
                              )}
                            </td>
                          );
                        }

                        if (slot.is_break) {
                          return (
                            <td key={day} className="p-2.5 border-r border-slate-200 bg-amber-50/70 align-top">
                              <div className="p-2 rounded-xl border border-dashed border-amber-300 bg-amber-100/60 flex flex-col justify-between h-full">
                                <div className="flex items-center space-x-1.5 text-amber-900 font-extrabold text-[11px]">
                                  <Coffee className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                  <span className="truncate">{slot.subject}</span>
                                </div>
                                <span className="text-[10px] text-amber-800 font-medium mt-1">
                                  {slot.room || 'Cafeteria'}
                                </span>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={day} className="p-2.5 border-r border-slate-200 align-top">
                            <div className="p-2.5 rounded-xl border border-slate-300 bg-white hover:border-blue-500 hover:shadow-xs transition-all flex flex-col justify-between h-full group">
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="font-extrabold text-slate-900 truncate text-xs">
                                    {slot.subject}
                                  </span>
                                  {isTeacher && teacherViewMode === 'teaching' && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                                      {slot.class_name}-{slot.section}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-0.5 text-[11px] text-slate-600 font-medium">
                                  <div className="flex items-center space-x-1 truncate">
                                    <User className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span className="truncate">{slot.teacher_name || 'Unassigned'}</span>
                                  </div>
                                  <div className="flex items-center space-x-1 truncate text-slate-500">
                                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span className="truncate">{slot.room || currentClassroom?.room || 'Room 101'}</span>
                                  </div>
                                </div>
                              </div>

                              {(isAdmin || canEditSlot(slot)) && (
                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleOpenEditModal(slot)}
                                    className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                    title="Edit Period"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteTargetSlot(slot)}
                                    className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                    title="Delete Period"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          5. LAYOUT VIEW B: DAILY DETAILED TIMELINE (CARD VIEW)
          ===================================================================== */}
      {layoutMode === 'daily' && (
        <div className="space-y-4">
          {/* Day Selector Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-300 pb-2 overflow-x-auto">
            {WEEKDAYS.map((day) => {
              const countForDay = isTeacher && teacherViewMode === 'teaching'
                ? (teacherTimetableData?.grid?.[day] || []).length
                : (timetableData?.grid?.[day] || []).length;

              return (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-2 ${
                    activeDay === day
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-500 hover:bg-slate-50'
                  }`}
                >
                  <span>{day}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    activeDay === day ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {countForDay}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  {isTeacher && teacherViewMode === 'teaching' ? (
                    <>My Teaching Rotation &bull; {activeDay}</>
                  ) : (
                    <>{activeDay}'s Schedule &bull; {currentClassroom?.name || timetableData?.class_name} &mdash; Section {currentClassroom?.section || timetableData?.section}</>
                  )}
                </h3>
              </div>
              <div className="flex items-center space-x-3 text-xs font-semibold text-slate-600">
                <span>Academic Session: <strong className="text-slate-900">{academicYear}</strong></span>
                <span>&bull;</span>
                <span>Total: <strong className="text-slate-900">{displayedDailyPeriods.length} Periods</strong></span>
              </div>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-xs font-bold text-slate-600">
                  Loading timetable for {activeDay}...
                </p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && displayedDailyPeriods.length === 0 && (
              <div className="py-14 text-center max-w-md mx-auto">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
                  <Calendar className="w-7 h-7" />
                </div>
                {isTeacher && teacherViewMode === 'teaching' ? (
                  <>
                    <h4 className="text-sm font-black text-slate-900">
                      No Teaching Periods Scheduled for {activeDay}
                    </h4>
                    <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                      You have no instructional classes assigned on <span className="font-bold text-slate-900">{activeDay}</span> in academic year <span className="font-bold text-slate-900">{academicYear}</span>.
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="text-sm font-black text-slate-900">
                      No timetable created for this day
                    </h4>
                    <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                      No timetable periods have been registered for{' '}
                      <span className="font-bold text-slate-900">{currentClassroom?.name} - Section {currentClassroom?.section}</span> on{' '}
                      <span className="font-bold text-slate-900">{activeDay} ({academicYear})</span>.
                    </p>
                    {(isAdmin || canEditCurrentClass) && (
                      <button
                        onClick={() => handleOpenAddModal(activeDay, 1)}
                        className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Add Period 1 for {activeDay}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Daily Periods List */}
            {!loading && !error && displayedDailyPeriods.length > 0 && (
              <div className="mt-5 space-y-3">
                {displayedDailyPeriods.map((slot) => {
                  if (slot.is_break) {
                    return (
                      <div
                        key={slot.id}
                        className="py-3 px-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center space-x-3 text-xs font-bold text-amber-950">
                          <div className="p-1.5 rounded-lg bg-amber-200/80 text-amber-800">
                            <Coffee className="w-4 h-4 shrink-0" />
                          </div>
                          <span className="font-mono text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-amber-200">
                            {slot.start_time} - {slot.end_time}
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="font-extrabold text-amber-900">{slot.subject}</span>
                          <span className="text-xs font-normal text-amber-700 hidden md:inline">
                            &bull; {slot.room || 'Cafeteria & Courtyard'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 self-end sm:self-auto">
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                            Campus Recess
                          </span>
                          {(isAdmin || canEditSlot(slot)) && (
                            <div className="flex items-center space-x-1 ml-2">
                              <button
                                onClick={() => handleOpenEditModal(slot)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-white border border-transparent hover:border-slate-300 transition-colors"
                                title="Edit Period"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteTargetSlot(slot)}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-white border border-transparent hover:border-slate-300 transition-colors"
                                title="Delete Period"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={slot.id}
                      className="p-4 rounded-xl border border-slate-300 bg-slate-50/70 hover:bg-white hover:border-blue-400 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start sm:items-center space-x-3.5">
                        <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold text-slate-800 shrink-0 text-center shadow-2xs">
                          <span className="block text-[10px] text-slate-400 uppercase font-sans">Slot {slot.period_number}</span>
                          <span>{slot.start_time} - {slot.end_time}</span>
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900">{slot.subject}</h4>
                            {isTeacher && teacherViewMode === 'teaching' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                {slot.class_name} - Sec {slot.section}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-600 font-medium">
                            <span className="inline-flex items-center space-x-1">
                              <User className="w-3.5 h-3.5 text-blue-600" />
                              <span>{slot.teacher_name ? slot.teacher_name : 'No Instructor Assigned'}</span>
                            </span>
                            <span className="inline-flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{slot.room || currentClassroom?.room || 'Main Hall'}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-lg">
                          Period {slot.period_number}
                        </span>

                        {(isAdmin || canEditSlot(slot)) && (
                          <div className="flex items-center space-x-1 ml-1">
                            <button
                              onClick={() => handleOpenEditModal(slot)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-300 transition-colors"
                              title="Edit this period"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetSlot(slot)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-300 transition-colors"
                              title="Delete this period"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          6. MODAL: ADD / EDIT PERIOD
          ===================================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSlot ? `Edit Period ${editingSlot.period_number}` : `Add Period to ${currentClassroom?.name} - Sec ${currentClassroom?.section}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSavePeriod} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Class & Section</label>
              {editingSlot ? (
                <input
                  type="text"
                  disabled
                  value={`${currentClassroom?.name || 'Class'} - Section ${currentClassroom?.section || 'A'} (${academicYear})`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-bold"
                />
              ) : (
                <select
                  value={modalClassId || selectedClassId || ''}
                  onChange={(e) => setModalClassId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {displayClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Day of Week</label>
              <select
                value={formData.day_of_week}
                onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {WEEKDAYS.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Period Number and Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Period Slot #</label>
              <select
                value={formData.period_number}
                onChange={(e) => handlePeriodNumberChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                  <option key={p} value={p}>Period {p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Start Time (HH:MM)</label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">End Time (HH:MM)</label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Is Break Toggle */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Coffee className="w-4 h-4 text-amber-600" />
              <div>
                <span className="font-bold text-slate-900 block">Recess / Lunch Period</span>
                <span className="text-[11px] text-slate-500">Marks this slot as non-instructional campus break</span>
              </div>
            </div>
            <input
              type="checkbox"
              id="is_break_checkbox"
              checked={formData.is_break}
              onChange={(e) => {
                const checked = e.target.checked;
                setFormData(prev => ({
                  ...prev,
                  is_break: checked,
                  subject: checked && !prev.subject ? 'Lunch & Campus Recess' : prev.subject
                }));
              }}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
          </div>

          {/* Subject */}
          <div className="text-xs">
            <label className="block font-bold text-slate-700 mb-1">
              {formData.is_break ? 'Break Title / Description' : 'Subject Name'}
            </label>
            <input
              type="text"
              required
              placeholder={formData.is_break ? 'e.g. Lunch & Campus Recess' : 'e.g. English, Mathematics, Science, Hindi, Computer'}
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Instructor & Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Assigned Teacher</label>
              <select
                disabled={formData.is_break}
                value={formData.teacher_id}
                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">-- No Teacher / Unassigned --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.department || t.subject || 'Faculty'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Room / Facility</label>
              <input
                type="text"
                placeholder={currentClassroom?.room || 'Room 101'}
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Modal Buttons */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formSubmitting}
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 disabled:opacity-50"
            >
              {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingSlot ? 'Update Period' : 'Save Period'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* =====================================================================
          7. MODAL: DELETE CONFIRMATION
          ===================================================================== */}
      <Modal
        isOpen={Boolean(deleteTargetSlot)}
        onClose={() => setDeleteTargetSlot(null)}
        title="Delete Timetable Period"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-rose-900">Are you sure you want to delete this period?</p>
              <p>
                Period {deleteTargetSlot?.period_number} &mdash; <strong>{deleteTargetSlot?.subject}</strong> on{' '}
                <strong>{deleteTargetSlot?.day_of_week}</strong> will be removed.
              </p>
              <p className="text-[11px] text-rose-700 font-semibold">
                This affects ONLY {currentClassroom?.name} - Section {currentClassroom?.section}. All other grades and records remain untouched.
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2.5 pt-2">
            <button
              type="button"
              onClick={() => setDeleteTargetSlot(null)}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm disabled:opacity-50"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Delete</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
