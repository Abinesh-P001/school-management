import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PlusCircle,
  Search,
  Award,
  Calendar,
  Clock,
  FileText,
  FileSpreadsheet,
  Printer,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Send,
  Eye,
  RefreshCw,
  BarChart2,
  TrendingUp,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  ChevronRight,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import { useApp } from '../context/AppContext';
import { isUserAdmin, isUserTeacher, isUserStudent, canCreateExam, canEditExam, canEnterMarks, isClassAssignedToTeacher } from '../utils/permissions';
import { exportToExcel } from '../utils/excelExport';
import {
  fetchExaminations,
  fetchExamMarks,
  saveSingleMark,
  bulkSaveMarks,
  fetchExamResultsSummary,
  fetchExamReportCards,
  fetchSingleStudentReportCards,
  createExamRecord,
  updateExamRecord,
  deleteExamRecord,
  lockExamRecord,
  publishExamRecord,
  reopenExamRecord,
  fetchGradingRules
} from '../services/schoolService';

export default function ExamsMarksPage() {
  const { classes, currentUser, currentStudent, currentTeacher, teacherAssignments, showToast, searchGlobal } = useApp();
  const isAdmin = isUserAdmin(currentUser);
  const isTeacher = isUserTeacher(currentUser);
  const isStudent = isUserStudent(currentUser);

  // Filter classes strictly to teacher assigned classes for faculty
  const displayClasses = useMemo(() => {
    if (!isTeacher) return classes;
    const assigned = classes.filter(c => isClassAssignedToTeacher(c.id, teacherAssignments, currentTeacher));
    return assigned.length > 0 ? assigned : classes;
  }, [classes, isTeacher, teacherAssignments, currentTeacher]);

  // Active module tab: 'exams' | 'marks' | 'results' | 'report_cards' | 'timetable' | 'analytics'
  const [activeTab, setActiveTab] = useState('exams');

  // Global Filter States
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedExamType, setSelectedExamType] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Data States
  const [loading, setLoading] = useState(false);
  const [examsList, setExamsList] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [marksRoster, setMarksRoster] = useState([]);
  const [hasUnsavedMarks, setHasUnsavedMarks] = useState(false);
  const [resultsSummary, setResultsSummary] = useState(null);
  const [reportCards, setReportCards] = useState([]);
  const [selectedReportStudentId, setSelectedReportStudentId] = useState('All');
  const [gradingRules, setGradingRules] = useState([]);

  // Modal States
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [examForm, setExamForm] = useState({
    name: 'Unit Test 1',
    academic_year: '2026-2027',
    class_id: '',
    section: 'A',
    exam_type: 'Unit Test',
    subject: 'Mathematics',
    exam_date: new Date().toISOString().split('T')[0],
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    time_slot: '09:00 AM - 12:00 PM',
    total_marks: 100,
    passing_marks: 40,
    status: 'Draft'
  });

  // Prepopulate initial class if not set
  useEffect(() => {
    if (displayClasses && displayClasses.length > 0 && !selectedClassId) {
      if (isStudent && currentStudent?.class_id) {
        setSelectedClassId(String(currentStudent.class_id));
      } else {
        setSelectedClassId(String(displayClasses[0].id));
      }
    }
  }, [displayClasses, selectedClassId, isStudent, currentStudent]);

  // Load grading scale once
  useEffect(() => {
    fetchGradingRules().then(setGradingRules).catch(() => {});
  }, []);

  // 1. Fetch Examinations when class / section / year / exam_type changes
  const loadExaminations = useCallback(async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const data = await fetchExaminations({
        academic_year: academicYear,
        class_id: selectedClassId,
        section: selectedSection,
        exam_type: selectedExamType,
        subject: selectedSubject
      });
      setExamsList(data || []);
      // If selected exam is no longer in the list, set to the first one
      if (data && data.length > 0) {
        if (!selectedExamId || !data.some(e => e.id === selectedExamId)) {
          setSelectedExamId(data[0].id);
        }
      } else {
        setSelectedExamId(null);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load examinations', 'error');
    } finally {
      setLoading(false);
    }
  }, [academicYear, selectedClassId, selectedSection, selectedExamType, selectedSubject, selectedExamId, showToast]);

  useEffect(() => {
    loadExaminations();
  }, [loadExaminations]);

  // Selected Exam Object
  const currentExam = useMemo(() => {
    return examsList.find(e => e.id === Number(selectedExamId)) || null;
  }, [examsList, selectedExamId]);

  // 2. Fetch Marks when activeTab is 'marks' or selectedExamId changes
  const loadExamMarks = useCallback(async (examId) => {
    if (!examId) {
      setMarksRoster([]);
      return;
    }
    setLoading(true);
    try {
      const marksData = await fetchExamMarks(examId);
      setMarksRoster(marksData || []);
      setHasUnsavedMarks(false);
    } catch (err) {
      showToast(err.message || 'Failed to load exam marks roster', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // 3. Fetch Results when activeTab is 'results' or 'analytics'
  const loadResultsSummary = useCallback(async (examId) => {
    if (!examId) {
      setResultsSummary(null);
      return;
    }
    setLoading(true);
    try {
      const summary = await fetchExamResultsSummary(examId);
      setResultsSummary(summary);
    } catch (err) {
      console.warn('Could not load results summary:', err.message);
      setResultsSummary(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. Fetch Report Cards when activeTab is 'report_cards'
  const loadReportCards = useCallback(async (examId, studentId = null) => {
    setLoading(true);
    try {
      let cards = [];
      if (isStudent) {
        if (!currentStudent?.id) {
          setReportCards([]);
          return;
        }
        cards = await fetchSingleStudentReportCards(currentStudent.id);
      } else if (examId) {
        const targetSid = studentId && studentId !== 'All' ? Number(studentId) : null;
        cards = await fetchExamReportCards(examId, targetSid);
      }
      setReportCards(cards || []);
    } catch (err) {
      showToast(err.message || 'Failed to load academic report cards', 'error');
      setReportCards([]);
    } finally {
      setLoading(false);
    }
  }, [isStudent, currentStudent, showToast]);

  // Trigger data reload based on active tab
  useEffect(() => {
    if (activeTab === 'marks' && selectedExamId) {
      loadExamMarks(selectedExamId);
    } else if ((activeTab === 'results' || activeTab === 'analytics') && selectedExamId) {
      loadResultsSummary(selectedExamId);
    } else if (activeTab === 'report_cards') {
      loadReportCards(selectedExamId, selectedReportStudentId);
    }
  }, [activeTab, selectedExamId, selectedReportStudentId, loadExamMarks, loadResultsSummary, loadReportCards]);

  // Class Selection Helpers
  const canEnterThisExamMarks = isAdmin || canEnterMarks(currentUser, currentExam, teacherAssignments);

  const currentClassObj = useMemo(() => {
    return classes.find(c => String(c.id) === String(selectedClassId)) || null;
  }, [classes, selectedClassId]);

  const distinctSections = useMemo(() => {
    if (!currentClassObj) return ['A'];
    const matching = classes.filter(c => c.name === currentClassObj.name);
    return ['All', ...new Set(matching.map(c => c.section).filter(Boolean))];
  }, [classes, currentClassObj]);

  const distinctSubjects = useMemo(() => {
    const fromExams = examsList.map(e => e.subject);
    return ['All', ...new Set(fromExams.filter(Boolean))];
  }, [examsList]);

  // Search filtering in Marks Roster
  const queryText = (searchTerm || searchGlobal || '').trim().toLowerCase();
  const filteredMarksRoster = useMemo(() => {
    if (!queryText) return marksRoster;
    return marksRoster.filter(m => {
      const name = String(m.student_name || '').toLowerCase();
      const code = String(m.student_code || '').toLowerCase();
      const adm = String(m.admission_number || '').toLowerCase();
      const roll = String(m.roll_number || '').toLowerCase();
      return name.includes(queryText) || code.includes(queryText) || adm.includes(queryText) || roll.includes(queryText);
    });
  }, [marksRoster, queryText]);

  // Handlers for Marks Entry
  const handleMarkChange = (studentId, field, value) => {
    setMarksRoster(prev => prev.map(m => {
      if (m.student_id !== studentId) return m;

      const updated = { ...m, [field]: value };
      const totalMarks = currentExam?.total_marks || 100;
      const passMarks = currentExam?.passing_marks || 40;

      if (field === 'is_absent') {
        if (value === true) {
          updated.marks_obtained = null;
          updated.percentage = null;
          updated.grade = 'AB';
          updated.status = 'Absent';
        } else {
          updated.marks_obtained = 0;
          updated.percentage = 0;
          updated.grade = 'F';
          updated.status = 'Failed';
        }
      } else if (field === 'marks_obtained') {
        const num = value === '' ? null : Number(value);
        if (num === null || isNaN(num)) {
          updated.marks_obtained = null;
          updated.percentage = null;
          updated.grade = '--';
          updated.status = 'Pending';
        } else {
          const clamped = Math.max(0, Math.min(totalMarks, num));
          updated.marks_obtained = clamped;
          const pct = Math.round((clamped / totalMarks) * 100);
          updated.percentage = pct;
          updated.status = clamped >= passMarks ? 'Passed' : 'Failed';

          // Dynamic Grade Lookup
          if (gradingRules && gradingRules.length > 0) {
            const rule = gradingRules.find(r => pct >= Number(r.min_percentage) && pct <= Number(r.max_percentage));
            updated.grade = rule ? rule.grade : (clamped >= passMarks ? 'C' : 'F');
          } else {
            if (pct >= 90) updated.grade = 'A+';
            else if (pct >= 80) updated.grade = 'A';
            else if (pct >= 70) updated.grade = 'B+';
            else if (pct >= 60) updated.grade = 'B';
            else if (pct >= 50) updated.grade = 'C';
            else if (pct >= 40) updated.grade = 'D';
            else updated.grade = 'F';
          }
        }
      }

      return updated;
    }));
    setHasUnsavedMarks(true);
  };

  const handleSaveSingleRow = async (markRow) => {
    if (!currentExam) return;
    try {
      const payload = {
        examination_id: currentExam.id,
        student_id: markRow.student_id,
        marks_obtained: markRow.is_absent ? 0 : markRow.marks_obtained,
        is_absent: Boolean(markRow.is_absent),
        remarks: markRow.remarks || ''
      };
      await saveSingleMark(currentExam.id, payload);
      showToast(`Saved marks for ${markRow.student_name}!`, 'success');
      loadExamMarks(currentExam.id);
    } catch (err) {
      showToast(err.message || 'Failed to save student mark', 'error');
    }
  };

  const handleBulkSaveMarks = async () => {
    if (!currentExam) return;
    try {
      const items = marksRoster
        .filter(m => m.is_absent || (m.marks_obtained !== null && !isNaN(m.marks_obtained)))
        .map(m => ({
          student_id: m.student_id,
          marks_obtained: m.is_absent ? 0 : m.marks_obtained,
          is_absent: Boolean(m.is_absent),
          remarks: m.remarks || ''
        }));

      if (items.length === 0) {
        showToast('Please enter marks or mark absent before saving.', 'info');
        return;
      }

      const res = await bulkSaveMarks(currentExam.id, items);
      showToast(res.message || 'All marks saved successfully!', 'success');
      setHasUnsavedMarks(false);
      loadExamMarks(currentExam.id);
    } catch (err) {
      showToast(err.message || 'Failed to save marks roster', 'error');
    }
  };

  // Lock / Unlock / Publish Handlers
  const handleToggleLock = async (exam) => {
    try {
      if (exam.is_locked) {
        await reopenExamRecord(exam.id);
        showToast(`Unlocked marks entry for ${exam.name} (${exam.subject})`, 'info');
      } else {
        await lockExamRecord(exam.id);
        showToast(`Marks entry locked for ${exam.name} (${exam.subject})`, 'success');
      }
      loadExaminations();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    }
  };

  const handlePublishExam = async (exam) => {
    if (!window.confirm(`Are you sure you want to publish results for ${exam.name} (${exam.subject})? Students will immediately be able to view their verified report cards.`)) {
      return;
    }
    try {
      await publishExamRecord(exam.id);
      showToast(`Results published successfully for ${exam.name}!`, 'success');
      loadExaminations();
    } catch (err) {
      showToast(err.message || 'Failed to publish results', 'error');
    }
  };

  // Schedule Exam Form Handlers
  const openCreateExamModal = () => {
    setEditingExam(null);
    const initialClass = displayClasses.find(c => String(c.id) === String(selectedClassId)) || displayClasses[0] || classes[0];
    setExamForm({
      name: 'Unit Test 1',
      academic_year: academicYear,
      class_id: initialClass?.id || '',
      section: selectedSection !== 'All' ? selectedSection : (initialClass?.section || 'A'),
      exam_type: 'Unit Test',
      subject: 'Mathematics',
      exam_date: new Date().toISOString().split('T')[0],
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      time_slot: '09:00 AM - 12:00 PM',
      total_marks: 100,
      passing_marks: 40,
      status: 'Draft'
    });
    setIsExamModalOpen(true);
  };

  const openEditExamModal = (exam) => {
    setEditingExam(exam);
    setExamForm({
      name: exam.name,
      academic_year: exam.academic_year,
      class_id: exam.class_id,
      section: exam.section || 'A',
      exam_type: exam.exam_type,
      subject: exam.subject,
      exam_date: exam.exam_date,
      start_date: exam.start_date || exam.exam_date,
      end_date: exam.end_date || exam.exam_date,
      time_slot: exam.time_slot || '09:00 AM - 12:00 PM',
      total_marks: exam.total_marks,
      passing_marks: exam.passing_marks,
      status: exam.status
    });
    setIsExamModalOpen(true);
  };

  const handleSubmitExamForm = async (e) => {
    e.preventDefault();
    try {
      if (editingExam) {
        await updateExamRecord(editingExam.id, examForm);
        showToast(`Updated examination ${examForm.name}!`, 'success');
      } else {
        await createExamRecord(examForm);
        showToast(`Scheduled new examination ${examForm.name}!`, 'success');
      }
      setIsExamModalOpen(false);
      loadExaminations();
    } catch (err) {
      showToast(err.message || 'Failed to save examination', 'error');
    }
  };

  const handleDeleteExam = async (exam) => {
    if (!window.confirm(`Are you sure you want to delete ${exam.name} (${exam.subject})? This will permanently delete all student marks entered for this exam.`)) {
      return;
    }
    try {
      await deleteExamRecord(exam.id);
      showToast('Examination deleted successfully', 'success');
      loadExaminations();
    } catch (err) {
      showToast(err.message || 'Failed to delete examination', 'error');
    }
  };

  // Export to Excel handlers
  const handleExportMarksExcel = () => {
    if (!marksRoster || marksRoster.length === 0) {
      showToast('No marks data available to export', 'info');
      return;
    }
    const formatted = marksRoster.map(m => ({
      'Roll Number': m.roll_number || '--',
      'Admission Number': m.admission_number || '--',
      'Student Name': m.student_name,
      'Examination': m.exam_name,
      'Class & Section': `${m.class_name || ''} ${m.section || ''}`,
      'Subject': m.subject,
      'Max Marks': m.max_marks,
      'Passing Marks': m.passing_marks,
      'Marks Obtained': m.is_absent ? 'ABSENT' : (m.marks_obtained !== null ? m.marks_obtained : '--'),
      'Percentage': m.percentage !== null && !m.is_absent ? `${m.percentage}%` : '--',
      'Grade': m.grade,
      'Result Status': m.status,
      'Teacher Remarks': m.remarks || ''
    }));
    exportToExcel(formatted, `${currentExam?.name || 'Exam'}_${currentExam?.subject || 'Marks'}_Ledger.xlsx`, 'Marks_Ledger');
    showToast(`Exported ${formatted.length} marks records to Excel!`, 'success');
  };

  const handleExportResultsExcel = () => {
    if (!resultsSummary || !resultsSummary.results) {
      showToast('No results data available to export', 'info');
      return;
    }
    const formatted = resultsSummary.results.map(r => ({
      'Rank': r.rank ? `#${r.rank}` : '--',
      'Roll Number': r.roll_number || '--',
      'Admission Number': r.admission_number || '--',
      'Student Name': r.student_name,
      'Total Score': `${r.total_marks_obtained} / ${r.total_max_marks}`,
      'Percentage': `${r.overall_percentage}%`,
      'Overall Grade': r.overall_grade,
      'Status': r.overall_status
    }));
    exportToExcel(formatted, `${resultsSummary.class_name}_${resultsSummary.section}_Results.xlsx`, 'Results_Summary');
    showToast('Exported results summary to Excel!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-300 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
              {isStudent ? 'Student Portal' : isTeacher ? 'Teacher Portal' : 'Admin Controller'}
            </span>
            <span className="text-xs text-slate-500 font-semibold">&bull; Academic Year: {academicYear}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            {isStudent ? 'My Academic Marks & Report Cards' : 'Exams & Marks Management System'}
          </h1>
          <p className="text-xs text-slate-600 font-medium mt-1">
            {isStudent
              ? 'View official subject scores, grades, verified results, and printable academic report cards.'
              : 'Complete class-wise and section-wise examination scheduling, marks entry, automatic rankings, and report cards.'
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'marks' && (
            <button
              onClick={handleExportMarksExcel}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-all shadow-xs"
              title="Export Marks to Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export Marks (.xlsx)</span>
            </button>
          )}

          {activeTab === 'results' && (
            <button
              onClick={handleExportResultsExcel}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export Results (.xlsx)</span>
            </button>
          )}

          {activeTab === 'report_cards' && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 text-xs font-bold transition-all shadow-xs"
            >
              <Printer className="w-4 h-4 text-indigo-700" />
              <span>Print Report Card</span>
            </button>
          )}

          {(isAdmin || isTeacher) && (
            <button
              onClick={openCreateExamModal}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Schedule Exam</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Global Filters Bar (Class, Section, Academic Year) */}
      {!isStudent && (
        <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Academic Year</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="2026-2027">2026-2027 (Active)</option>
              <option value="2025-2026">2025-2026 (Archived)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Grade / Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSection('All');
              }}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {displayClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} (Section {cls.section})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Section Filter</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {distinctSections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === 'All' ? 'All Sections' : `Section ${sec}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Exam Type</label>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value="All">All Exam Types</option>
              <option value="Unit Test">Unit Test</option>
              <option value="Mid-Term">Mid-Term</option>
              <option value="Half-Yearly">Half-Yearly</option>
              <option value="Annual">Annual / Board</option>
              <option value="Quiz">Weekly Quiz</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Subject Filter</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600"
            >
              {distinctSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub === 'All' ? 'All Subjects' : sub}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-300 pb-2 overflow-x-auto no-print">
        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'exams'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-500'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. Exam Management ({examsList.length})</span>
        </button>

        {!isStudent && (
          <button
            onClick={() => setActiveTab('marks')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'marks'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-500'
            }`}
          >
            <Edit className="w-4 h-4" />
            <span>2. Marks Entry</span>
            {hasUnsavedMarks && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          </button>
        )}

        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'results'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-500'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>3. Student Results</span>
        </button>

        <button
          onClick={() => setActiveTab('report_cards')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'report_cards'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-500'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>4. Report Cards</span>
        </button>

        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'timetable'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
              : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-500'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>5. Exam Timetable</span>
        </button>

        {!isStudent && (
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-500'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>6. Marks Reports & Analytics</span>
          </button>
        )}
      </div>

      {/* 4. Tab Content */}

      {/* TAB 1: EXAM MANAGEMENT */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-extrabold text-slate-900">
                Examinations configured for {currentClassObj ? `${currentClassObj.name} - Section ${currentClassObj.section}` : 'selected class'}
              </span>
            </div>
            <span className="text-xs text-slate-500 font-semibold">{examsList.length} total examinations</span>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-300">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Loading examinations from database...</p>
            </div>
          ) : examsList.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No examinations scheduled for this class and section.</p>
              <p className="text-xs text-slate-500 mt-1">Click "+ Schedule Exam" above to configure your first test or exam.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      <th className="py-3 px-4">Exam Code</th>
                      <th className="py-3 px-4">Exam Name</th>
                      <th className="py-3 px-4">Class & Section</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4 text-center">Marks (Max / Pass)</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Lock Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
                    {examsList.map((exam) => (
                      <tr key={exam.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{exam.exam_code}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{exam.name}</td>
                        <td className="py-3 px-4 font-bold text-slate-700">{exam.class_name || 'Class'}</td>
                        <td className="py-3 px-4 font-extrabold text-indigo-700">{exam.subject}</td>
                        <td className="py-3 px-4">
                          <div>{exam.exam_date}</div>
                          <div className="text-[11px] text-slate-500">{exam.time_slot}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          <span className="text-slate-900">{exam.total_marks}</span> / <span className="text-slate-500">{exam.passing_marks}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            exam.status === 'Published' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            exam.status === 'Completed' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                            exam.status === 'Ongoing' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {exam.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {exam.is_locked ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Lock className="w-3 h-3" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <Unlock className="w-3 h-3" />
                              <span>Open</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {!isStudent && (
                              <button
                                onClick={() => {
                                  setSelectedExamId(exam.id);
                                  setActiveTab('marks');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors"
                                title="Enter or edit student marks"
                              >
                                Enter Marks
                              </button>
                            )}

                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => handleToggleLock(exam)}
                                  className="p-1 rounded-lg text-slate-600 hover:bg-slate-100"
                                  title={exam.is_locked ? 'Unlock Marks Entry' : 'Lock Marks Entry'}
                                >
                                  {exam.is_locked ? <Unlock className="w-3.5 h-3.5 text-amber-600" /> : <Lock className="w-3.5 h-3.5" />}
                                </button>
                                {exam.status !== 'Published' && (
                                  <button
                                    onClick={() => handlePublishExam(exam)}
                                    className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-50"
                                    title="Publish Results to Students"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                            {(isAdmin || canEditExam(currentUser, exam, teacherAssignments)) && (
                              <button
                                onClick={() => openEditExamModal(exam)}
                                className="p-1 rounded-lg text-slate-600 hover:bg-slate-100"
                                title="Edit Examination"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteExam(exam)}
                                className="p-1 rounded-lg text-rose-600 hover:bg-rose-50"
                                title="Delete Examination"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MARKS ENTRY (SUBJECT-WISE & CLASS/SECTION ISOLATED) */}
      {activeTab === 'marks' && !isStudent && (
        <div className="space-y-4">
          {/* Exam Selector Banner */}
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">Select Examination to Grade</label>
                <select
                  value={selectedExamId || ''}
                  onChange={(e) => setSelectedExamId(Number(e.target.value))}
                  className="px-3 py-2 text-xs font-extrabold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600 min-w-[240px]"
                >
                  {examsList.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} &bull; {ex.subject} ({ex.class_name})
                    </option>
                  ))}
                </select>
              </div>

              {currentExam && (
                <div className="flex items-center space-x-2 text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 mt-4 md:mt-0">
                  <span className="font-extrabold text-slate-900">{currentExam.subject}</span>
                  <span className="text-slate-400">|</span>
                  <span>Max Marks: <strong className="text-slate-900">{currentExam.total_marks}</strong></span>
                  <span className="text-slate-400">|</span>
                  <span>Passing: <strong className="text-emerald-700">{currentExam.passing_marks}</strong></span>
                  <span className="text-slate-400">|</span>
                  {currentExam.is_locked ? (
                    <span className="text-amber-700 font-bold flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Ready for Entry</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {canEnterThisExamMarks ? (
                <button
                  onClick={handleBulkSaveMarks}
                  disabled={currentExam?.is_locked && !isAdmin}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Save All Marks</span>
                </button>
              ) : (
                <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>View-Only &bull; Assigned to Subject Faculty</span>
                </span>
              )}
            </div>
          </div>

          {/* Roster Table */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-300">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Loading student roster...</p>
            </div>
          ) : !currentExam ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-300 text-xs text-slate-500 font-bold">
              Please select or create an examination first.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-300 flex items-center justify-between">
                <div className="relative w-72">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search student by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <span className="text-xs text-slate-500 font-bold">
                  {filteredMarksRoster.length} students enrolled in this section
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-300">
                      <th className="py-2.5 px-3">Roll / Adm</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3 text-center">Absent?</th>
                      <th className="py-2.5 px-3 text-center">Marks Obtained (Max: {currentExam.total_marks})</th>
                      <th className="py-2.5 px-3 text-center">Percentage</th>
                      <th className="py-2.5 px-3 text-center">Grade</th>
                      <th className="py-2.5 px-3 text-center">Result Status</th>
                      <th className="py-2.5 px-3">Teacher Remarks</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs font-medium">
                    {filteredMarksRoster.map((row, idx) => (
                      <tr key={row.student_id} className={`hover:bg-slate-50 ${row.is_absent ? 'bg-rose-50/40' : ''}`}>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                          <div>{row.roll_number || `--`}</div>
                          <div className="text-[10px] text-slate-400">{row.student_code}</div>
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-900">{row.student_name}</td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(row.is_absent)}
                            disabled={!canEnterThisExamMarks || (currentExam.is_locked && !isAdmin)}
                            onChange={(e) => handleMarkChange(row.student_id, 'is_absent', e.target.checked)}
                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={currentExam.total_marks}
                            step="0.5"
                            disabled={!canEnterThisExamMarks || row.is_absent || (currentExam.is_locked && !isAdmin)}
                            value={row.marks_obtained !== null && row.marks_obtained !== undefined ? row.marks_obtained : ''}
                            onChange={(e) => handleMarkChange(row.student_id, 'marks_obtained', e.target.value)}
                            placeholder={row.is_absent ? 'ABSENT' : '0 - ' + currentExam.total_marks}
                            className={`w-24 px-2.5 py-1 text-center font-bold font-mono text-xs rounded-lg border focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${
                              row.is_absent ? 'bg-slate-100 text-slate-400 border-slate-300' :
                              row.status === 'Passed' ? 'border-emerald-400 bg-emerald-50/50 text-emerald-900' :
                              row.status === 'Failed' ? 'border-rose-400 bg-rose-50/50 text-rose-900' :
                              'border-slate-300 bg-white text-slate-900 focus:border-blue-600'
                            }`}
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {row.percentage !== null && !row.is_absent ? `${row.percentage}%` : '--'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-extrabold font-mono text-sm">
                          <span className={
                            row.grade === 'A+' || row.grade === 'A' ? 'text-emerald-700' :
                            row.grade === 'B+' || row.grade === 'B' ? 'text-blue-700' :
                            row.grade === 'AB' ? 'text-amber-700' : 'text-rose-700'
                          }>
                            {row.grade}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            row.status === 'Passed' ? 'bg-emerald-100 text-emerald-800' :
                            row.status === 'Failed' ? 'bg-rose-100 text-rose-800' :
                            row.status === 'Absent' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            placeholder="Add remarks..."
                            disabled={!canEnterThisExamMarks || (currentExam.is_locked && !isAdmin)}
                            value={row.remarks || ''}
                            onChange={(e) => handleMarkChange(row.student_id, 'remarks', e.target.value)}
                            className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleSaveSingleRow(row)}
                            disabled={!canEnterThisExamMarks || (currentExam.is_locked && !isAdmin)}
                            className="px-2 py-1 rounded-md bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-bold transition-colors disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-700 disabled:cursor-not-allowed"
                          >
                            Save
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STUDENT RESULTS & RANKING */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          {resultsSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Enrolled</span>
                <p className="text-lg font-black text-slate-900">{resultsSummary.total_enrolled}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Appeared</span>
                <p className="text-lg font-black text-blue-700">{resultsSummary.appeared_count}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Absent</span>
                <p className="text-lg font-black text-amber-700">{resultsSummary.absent_count}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Passed</span>
                <p className="text-lg font-black text-emerald-700">{resultsSummary.passed_count}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Failed</span>
                <p className="text-lg font-black text-rose-700">{resultsSummary.failed_count}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Pass Rate</span>
                <p className="text-lg font-black text-emerald-800">{resultsSummary.pass_percentage}%</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Average</span>
                <p className="text-lg font-black text-indigo-700">{resultsSummary.class_average}</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-xs text-center">
                <span className="text-[10px] font-extrabold uppercase text-slate-500">Top Score</span>
                <p className="text-lg font-black text-blue-900">{resultsSummary.highest_score}</p>
              </div>
            </div>
          )}

          {/* Results Table with Ranks */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-300 flex items-center justify-between">
              <span className="text-xs font-black text-slate-900">
                Official Results & Ranks for {currentExam?.name || 'Selected Examination'} ({currentExam?.subject || ''})
              </span>
              <span className="text-xs text-slate-500 font-bold">Ranks calculated strictly within this section</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-300">
                    <th className="py-2.5 px-3 text-center">Rank</th>
                    <th className="py-2.5 px-3">Roll / Code</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3 text-center">Score / Max</th>
                    <th className="py-2.5 px-3 text-center">Percentage</th>
                    <th className="py-2.5 px-3 text-center">Grade</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Report Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-medium">
                  {resultsSummary?.results.map((r) => (
                    <tr key={r.student_id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-black text-sm">
                        {r.rank ? (
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                            r.rank === 1 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                            r.rank === 2 ? 'bg-slate-200 text-slate-800' :
                            r.rank === 3 ? 'bg-amber-50 text-amber-800' : 'text-slate-600'
                          }`}>
                            #{r.rank}
                          </span>
                        ) : '--'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-600">
                        {r.roll_number || r.student_code}
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">{r.student_name}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 font-mono">
                        {r.total_marks_obtained} / {r.total_max_marks}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="font-mono">{r.overall_percentage}%</span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden hidden sm:block">
                            <div
                              className={`h-full ${r.overall_percentage >= 75 ? 'bg-emerald-500' : r.overall_percentage >= 40 ? 'bg-blue-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, r.overall_percentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-black font-mono text-sm">{r.overall_grade}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          r.overall_status === 'Passed' ? 'bg-emerald-100 text-emerald-800' :
                          r.overall_status === 'Failed' ? 'bg-rose-100 text-rose-800' :
                          r.overall_status === 'Absent' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {r.overall_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedReportStudentId(String(r.student_id));
                            setActiveTab('report_cards');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors"
                        >
                          View Transcript
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: OFFICIAL PRINTABLE REPORT CARDS */}
      {activeTab === 'report_cards' && (
        <div className="space-y-4">
          {/* Student Filter Toolbar (hidden on print) */}
          {!isStudent && (
            <div className="bg-white p-3 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between no-print">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-bold text-slate-700">Filter Student Report Card:</span>
                <select
                  value={selectedReportStudentId}
                  onChange={(e) => setSelectedReportStudentId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-extrabold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-blue-600 min-w-[200px]"
                >
                  <option value="All">All Students in Section</option>
                  {resultsSummary?.results.map(r => (
                    <option key={r.student_id} value={r.student_id}>
                      {r.student_name} ({r.roll_number || r.student_code})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => window.print()}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Copy</span>
              </button>
            </div>
          )}

          {/* Printable Report Card Sheet */}
          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-300 no-print">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">Generating verified report cards...</p>
            </div>
          ) : reportCards.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-300 no-print">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No published report cards available.</p>
              <p className="text-xs text-slate-500 mt-1">
                {isStudent ? 'Your examination results are pending publication by the school administration.' : 'Please publish the examination results to generate official student transcripts.'}
              </p>
            </div>
          ) : (
            <div id="printable-report-card" className="space-y-8">
              {reportCards.map((card) => (
                <div
                  key={card.student_id}
                  className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-300 shadow-sm space-y-6 page-break-after"
                >
                  {/* School Crest & Header */}
                  <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-700">Affiliated to CBSE / State Board of Education</span>
                    <h2 className="text-2xl font-black text-slate-950 tracking-tight">OAKRIDGE INTERNATIONAL SCHOOL</h2>
                    <p className="text-xs font-semibold text-slate-600">Campus: Knowledge Park Road, Sector 12 &bull; Contact: academics@oakridge.edu</p>
                    <div className="pt-2">
                      <span className="inline-block px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-950 text-white">
                        OFFICIAL ACADEMIC REPORT CARD &bull; {card.academic_year}
                      </span>
                    </div>
                  </div>

                  {/* Student Details Grid */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Student Name:</span>
                      <p className="font-black text-slate-900">{card.student_name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Admission Number:</span>
                      <p className="font-mono font-bold text-slate-900">{card.admission_number || '--'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Roll Number:</span>
                      <p className="font-mono font-bold text-slate-900">{card.roll_number || card.student_code}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Class & Section:</span>
                      <p className="font-black text-slate-900">{card.class_name} - Section {card.section}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Assessment:</span>
                      <p className="font-bold text-blue-800">{card.examination_name} ({card.exam_type})</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Exam Date:</span>
                      <p className="font-bold text-slate-700">{card.exam_date}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Class Rank:</span>
                      <p className="font-black text-indigo-700">Rank #{card.rank_in_class} of {card.total_students_in_class}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Final Result:</span>
                      <p className={`font-black uppercase ${card.overall_status === 'PASSED' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {card.overall_status}
                      </p>
                    </div>
                  </div>

                  {/* Subject-Wise Performance Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 font-black uppercase text-[11px] border-b border-slate-300">
                          <th className="py-2.5 px-3 border-r border-slate-300">Subject Name</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300">Max Marks</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300">Passing Threshold</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300">Marks Scored</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300">Percentage</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300">Letter Grade</th>
                          <th className="py-2.5 px-3 text-center border-r border-slate-300">Result</th>
                          <th className="py-2.5 px-3">Teacher Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {card.subjects.map((sub, sIdx) => (
                          <tr key={sIdx} className={sub.is_absent ? 'bg-amber-50/50' : ''}>
                            <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900">{sub.subject}</td>
                            <td className="py-2 px-3 border-r border-slate-200 text-center font-mono">{sub.max_marks}</td>
                            <td className="py-2 px-3 border-r border-slate-200 text-center font-mono">{sub.passing_marks}</td>
                            <td className="py-2 px-3 border-r border-slate-200 text-center font-mono font-bold">
                              {sub.is_absent ? <span className="text-amber-700 font-black">ABSENT</span> : sub.marks_obtained}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 text-center font-mono font-semibold">
                              {sub.percentage !== null && !sub.is_absent ? `${sub.percentage}%` : '--'}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200 text-center font-black font-mono text-sm">{sub.grade}</td>
                            <td className="py-2 px-3 border-r border-slate-200 text-center font-bold">
                              <span className={sub.status === 'Passed' ? 'text-emerald-700' : 'text-rose-700'}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 text-[11px]">{sub.remarks || '--'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-black text-slate-950 border-t-2 border-slate-400">
                          <td className="py-2.5 px-3 border-r border-slate-300">GRAND TOTAL</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 font-mono">{card.total_max_marks}</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 font-mono">--</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 font-mono text-blue-900 font-bold">{card.total_marks_obtained}</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 font-mono text-emerald-800 font-bold">{card.overall_percentage}%</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 font-mono text-base font-black">{card.overall_grade}</td>
                          <td className="py-2.5 px-3 text-center border-r border-slate-300 uppercase">{card.overall_status}</td>
                          <td className="py-2.5 px-3 text-slate-700">{card.remarks}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Grading Key & Signatures */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-300">
                    <div className="text-[10px] text-slate-500 space-y-1">
                      <span className="font-bold uppercase text-slate-700">Official Grading Scale Reference:</span>
                      <p>A+ (90-100% Outstanding) &bull; A (80-89% Excellent) &bull; B+ (70-79% Very Good) &bull; B (60-69% Good) &bull; C (50-59% Average) &bull; D (40-49% Pass) &bull; F (&lt;40% Fail) &bull; AB (Absent)</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-4">
                      <div className="border-t border-slate-400 pt-1">
                        <span className="font-bold text-slate-700">Class Mentor</span>
                      </div>
                      <div className="border-t border-slate-400 pt-1">
                        <span className="font-bold text-slate-700">Head of Examinations</span>
                      </div>
                      <div className="border-t border-slate-400 pt-1">
                        <span className="font-bold text-slate-700">Principal Signature</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: EXAM TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-between">
            <span className="text-xs font-black text-slate-900">
              Exam Schedule & Timetable Matrix ({currentClassObj ? `${currentClassObj.name} - Section ${currentClassObj.section}` : 'Selected Grade'})
            </span>
            <button
              onClick={() => {
                const formatted = examsList.map(e => ({
                  'Date': e.exam_date,
                  'Time Slot': e.time_slot,
                  'Exam Name': e.name,
                  'Subject': e.subject,
                  'Max Marks': e.total_marks,
                  'Passing Marks': e.passing_marks,
                  'Status': e.status
                }));
                exportToExcel(formatted, 'Exam_Timetable.xlsx', 'Exam_Timetable');
                showToast('Exam schedule exported to Excel!', 'success');
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export Timetable (.xlsx)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {examsList.map((ex) => (
              <div key={ex.id} className="bg-white p-4 rounded-2xl border border-slate-300 shadow-xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-700 font-mono">{ex.exam_code}</span>
                    <h4 className="text-sm font-black text-slate-900">{ex.subject}</h4>
                    <p className="text-xs text-slate-600 font-bold">{ex.name}</p>
                  </div>
                  <Badge variant={ex.status === 'Published' ? 'success' : 'default'}>{ex.status}</Badge>
                </div>

                <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ex.exam_date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ex.time_slot}</span>
                  </div>
                  <div className="flex items-center space-x-2 font-bold text-slate-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Total Marks: {ex.total_marks} (Passing: {ex.passing_marks})</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: MARKS REPORTS & ANALYTICS */}
      {activeTab === 'analytics' && !isStudent && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Top 3 Rankers */}
            <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Top Performing Students</span>
              </h3>
              <div className="space-y-2">
                {resultsSummary?.results.filter(r => r.rank && r.rank <= 3).map(r => (
                  <div key={r.student_id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-amber-400 text-white font-black text-xs flex items-center justify-center">
                        #{r.rank}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{r.student_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{r.student_code}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black font-mono text-emerald-700">{r.overall_percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pass vs Fail Ratio */}
            <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Pass Rate & Participation</span>
              </h3>
              {resultsSummary && (
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Pass Rate</span>
                      <span className="text-emerald-700 font-black">{resultsSummary.pass_percentage}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${resultsSummary.pass_percentage}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500">Appeared</span>
                      <p className="font-black text-slate-900">{resultsSummary.appeared_count}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Passed</span>
                      <p className="font-black text-emerald-700">{resultsSummary.passed_count}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Failed</span>
                      <p className="font-black text-rose-700">{resultsSummary.failed_count}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Attention Required List */}
            <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-rose-700 flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Attention Required (Failed / Absent)</span>
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {resultsSummary?.results.filter(r => r.overall_status === 'Failed' || r.is_absent_all).map(r => (
                  <div key={r.student_id} className="flex items-center justify-between p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs">
                    <div>
                      <p className="font-bold text-rose-900">{r.student_name}</p>
                      <p className="text-[10px] text-rose-600">{r.is_absent_all ? 'Marked Absent' : `Score: ${r.overall_percentage}%`}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-white text-rose-700 border border-rose-300">
                      {r.overall_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Schedule Exam Modal */}
      <Modal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        title={editingExam ? `Edit Examination: ${editingExam.exam_code}` : 'Schedule New Class Examination'}
      >
        <form onSubmit={handleSubmitExamForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Academic Year</label>
              <select
                value={examForm.academic_year}
                onChange={(e) => setExamForm({ ...examForm, academic_year: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Class</label>
              <select
                value={examForm.class_id}
                onChange={(e) => {
                  const selectedC = displayClasses.find(c => String(c.id) === String(e.target.value));
                  setExamForm({ 
                    ...examForm, 
                    class_id: Number(e.target.value),
                    section: selectedC?.section || examForm.section
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                {displayClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Section</label>
              <input
                type="text"
                value={examForm.section}
                onChange={(e) => setExamForm({ ...examForm, section: e.target.value })}
                placeholder="e.g. A"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Exam Type</label>
              <select
                value={examForm.exam_type}
                onChange={(e) => setExamForm({ ...examForm, exam_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="Unit Test">Unit Test</option>
                <option value="Mid-Term">Mid-Term</option>
                <option value="Half-Yearly">Half-Yearly</option>
                <option value="Annual">Annual / Board</option>
                <option value="Quiz">Weekly Quiz</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Examination Title</label>
              <input
                type="text"
                required
                value={examForm.name}
                onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                placeholder="e.g. Mid-Term Examination"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                required
                value={examForm.subject}
                onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                placeholder="e.g. Mathematics"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Exam Date</label>
              <input
                type="date"
                required
                value={examForm.exam_date}
                onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Time Slot Window</label>
              <input
                type="text"
                value={examForm.time_slot}
                onChange={(e) => setExamForm({ ...examForm, time_slot: e.target.value })}
                placeholder="09:00 AM - 12:00 PM"
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Total Maximum Marks</label>
              <input
                type="number"
                min="1"
                required
                value={examForm.total_marks}
                onChange={(e) => setExamForm({ ...examForm, total_marks: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Passing Threshold Marks</label>
              <input
                type="number"
                min="1"
                required
                value={examForm.passing_marks}
                onChange={(e) => setExamForm({ ...examForm, passing_marks: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsExamModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30"
            >
              {editingExam ? 'Save Changes' : 'Schedule Examination'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
