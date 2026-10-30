import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Users,
  School,
  DollarSign,
  UserPlus,
  PlusCircle,
  Receipt,
  Clock,
  ArrowRight,
  Calendar,
  Sparkles,
  CalendarDays,
  FileSpreadsheet,
  CheckCircle2,
  Award,
  AlertCircle,
  BookOpen,
  TrendingUp,
  FileText
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import Modal from '../components/common/Modal';
import AddStudentModal from '../components/forms/AddStudentModal';
import AddTeacherModal from '../components/forms/AddTeacherModal';
import RecordFeeModal from '../components/forms/RecordFeeModal';
import ClassMentorshipManager from '../components/admin/ClassMentorshipManager';
import AdminAttendanceManager from '../components/admin/AdminAttendanceManager';

import { isUserAdmin, isUserTeacher, isUserStudent, canAddStudent } from '../utils/permissions';

export default function DashboardPage() {
  const {
    students,
    teachers,
    classes,
    exams,
    fees,
    notices,
    recentActivities,
    pendingFeesSum,
    setCurrentPage,
    currentUser,
    currentStudent,
    currentTeacher,
    teacherAssignments
  } = useApp();

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [teacherModalOpen, setTeacherModalOpen] = useState(false);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [studentDossierOpen, setStudentDossierOpen] = useState(false);

  const isAdmin = isUserAdmin(currentUser);
  const isTeacher = isUserTeacher(currentUser);
  const isStudent = isUserStudent(currentUser);

  // Real data calculations
  const totalStudents = students.length;
  const totalTeachers = teachers.length;
  const totalClasses = classes.length;
  const formattedPendingFees = `₹${pendingFeesSum.toLocaleString()}`;

  // Teacher-specific data
  const teacherClasses = classes.filter(
    c => c.classTeacher === currentUser.name ||
      (currentTeacher?.classesAssigned && currentTeacher.classesAssigned.some(ca => ca.includes(c.name)))
  );
  const assignedClassCount = teacherAssignments?.teaching_assignments?.length || teacherClasses.length || 1;

  // Teacher mentorship students
  const mentoredClassId = teacherAssignments?.mentorship_class?.class_id;
  const mentoredClassStudents = useMemo(() => {
    return students.filter(s => {
      if (!mentoredClassId) return false;
      if (s.class_id === mentoredClassId) return true;
      const m = teacherAssignments?.mentorship_class;
      return (s.grade === m?.name || s.class_name === m?.name) && s.section === m?.section;
    });
  }, [students, mentoredClassId, teacherAssignments]);

  // Real chart data 1: Student Enrollment Distribution by Grade
  const gradeDistribution = useMemo(() => {
    const counts = {};
    students.forEach(s => {
      const g = s.grade || s.class_name || 'Other';
      counts[g] = (counts[g] || 0) + 1;
    });

    const standardGrades = ['Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    // ensure standard grades exist or merge
    const result = standardGrades.map(gradeName => {
      const count = counts[gradeName] || 0;
      const percentage = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
      return { grade: gradeName, count, percentage };
    });

    // Add any remaining grades that weren't in standard
    Object.keys(counts).forEach(k => {
      if (!standardGrades.includes(k) && k !== 'Other') {
        const count = counts[k];
        const percentage = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
        result.push({ grade: k, count, percentage });
      }
    });

    return result;
  }, [students, totalStudents]);

  // Real chart data 2: Financial Fee Collection Health
  const feeStats = useMemo(() => {
    let paid = 0;
    let pending = 0;
    let overdue = 0;

    fees.forEach(f => {
      const amt = Number(f.amount) || 0;
      if (f.status === 'Paid') paid += amt;
      else if (f.status === 'Pending') pending += amt;
      else if (f.status === 'Overdue') overdue += amt;
    });

    const total = paid + pending + overdue;
    const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
    const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
    const overduePct = total > 0 ? Math.round((overdue / total) * 100) : 0;

    return { paid, pending, overdue, total, paidPct, pendingPct, overduePct };
  }, [fees]);

  // Student specific data
  const studentAttendance = currentStudent?.attendance || "98%";
  const studentGpa = currentStudent?.gpa || "3.92";
  const studentFeeStatus = currentStudent?.feesStatus || "Paid";
  const upcomingExamsList = useMemo(() => {
    return exams.filter(e => e.status === 'Upcoming' || e.status === 'Scheduled').slice(0, 4);
  }, [exams]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white text-slate-900 p-5 sm:p-7 lg:p-8 shadow-xs border border-slate-200">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-900 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Welcome back, {currentUser?.name || 'User'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            {isAdmin && 'Institutional Command Center'}
            {isTeacher && 'Teacher Academic Faculty Portal'}
            {isStudent && 'Student Academic Dashboard'}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            {isAdmin && 'Monitor real-time enrollment across all grades, assign class mentors, verify faculty attendance, and track institutional finances from your unified administrative console.'}
            {isTeacher && 'Review your designated mentorship class roster, view your subject teaching allocations, mark daily student attendance, and submit examination marks.'}
            {isStudent && 'Access your personalized academic records, review examination schedules, track GPA performance, and view official school announcements.'}
          </p>

          {/* Role-Specific Quick Action Buttons */}
          <div className="mt-5 flex flex-wrap gap-2.5">
            {isAdmin && (
              <>
                <button
                  onClick={() => setStudentModalOpen(true)}
                  className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-white" />
                  <span>+ Add Student</span>
                </button>

                <button
                  onClick={() => setTeacherModalOpen(true)}
                  className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold transition-colors"
                >
                  <PlusCircle className="w-4 h-4 text-slate-700" />
                  <span>+ Add Teacher</span>
                </button>

                <button
                  onClick={() => setFeeModalOpen(true)}
                  className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold transition-colors"
                >
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>Record Fee Payment</span>
                </button>

                <button
                  onClick={() => setCurrentPage('timetable')}
                  className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold transition-colors"
                >
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  <span>Manage Timetables</span>
                </button>
              </>
            )}

            {isTeacher && (
              <>
                {canAddStudent(currentUser) && (
                  <button
                    onClick={() => setStudentModalOpen(true)}
                    className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    <UserPlus className="w-4 h-4 text-white" />
                    <span>+ Add Student</span>
                  </button>
                )}

                <button
                  onClick={() => setCurrentPage('attendance')}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold transition-colors"
                >
                  <Calendar className="w-4 h-4 text-slate-700" />
                  <span>Take Attendance</span>
                </button>

                <button
                  onClick={() => setCurrentPage('exams')}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Enter Exam Scores</span>
                </button>

                <button
                  onClick={() => setCurrentPage('timetable')}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold transition-colors"
                >
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  <span>View Timetable</span>
                </button>
              </>
            )}

            {isStudent && (
              <>
                <button
                  onClick={() => setStudentDossierOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <GraduationCap className="w-4 h-4 text-white" />
                  <span>View Student Dossier</span>
                </button>

                <button
                  onClick={() => setCurrentPage('timetable')}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold transition-colors"
                >
                  <CalendarDays className="w-4 h-4 text-slate-700" />
                  <span>Class Timetable</span>
                </button>

                <button
                  onClick={() => setCurrentPage('exams')}
                  className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold transition-colors"
                >
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>Report Cards & Marks</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Ambient subtle decorative tint */}
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-72 h-72 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
      </div>

      {/* Role-Specific Metric Cards */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <StatCard
            title="Total Students"
            value={totalStudents}
            icon={GraduationCap}
            trend="Active"
            trendPositive={true}
            subtitle="Across all grades & sections"
            accentColor="blue"
            onClick={() => setCurrentPage('students')}
          />
          <StatCard
            title="Faculty Staff"
            value={totalTeachers}
            icon={Users}
            trend="Assigned"
            trendPositive={true}
            subtitle="Academic teachers & mentors"
            accentColor="indigo"
            onClick={() => setCurrentPage('teachers')}
          />
          <StatCard
            title="Active Classes"
            value={totalClasses}
            icon={School}
            trend="Configured"
            trendPositive={true}
            subtitle="Grade 8 to Grade 12"
            accentColor="emerald"
            onClick={() => setCurrentPage('classes')}
          />
          <StatCard
            title="Pending Fees"
            value={formattedPendingFees}
            icon={DollarSign}
            trend={`${feeStats.pendingPct}% Unpaid`}
            trendPositive={feeStats.pendingPct === 0}
            subtitle="Click to view ledger"
            accentColor="amber"
            onClick={() => setCurrentPage('fees')}
          />
        </div>
      )}

      {/* Admin Real-Data Charts: Enrollment Distribution & Fee Ledger */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Real Student Enrollment Breakdown */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Student Enrollment by Grade
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Actual student distribution ({totalStudents} total enrolled)
                </p>
              </div>
              <button
                onClick={() => setCurrentPage('students')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span>Directory</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {gradeDistribution.map((item) => (
                <div key={item.grade}>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-slate-800">{item.grade}</span>
                    <span className="text-slate-600 font-bold">
                      <strong className="text-blue-600">{item.count}</strong> students ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(item.percentage, 4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Fee Ledger Health */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Institutional Fee Collection
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Total invoicing: ₹{feeStats.total.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setCurrentPage('fees')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span>Ledger</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="mt-5">
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${feeStats.paidPct}%` }}
                  title={`Paid: ₹${feeStats.paid.toLocaleString()} (${feeStats.paidPct}%)`}
                />
                <div
                  className="bg-amber-400 h-full transition-all duration-500"
                  style={{ width: `${feeStats.pendingPct}%` }}
                  title={`Pending: ₹${feeStats.pending.toLocaleString()} (${feeStats.pendingPct}%)`}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${feeStats.overduePct}%` }}
                  title={`Overdue: ₹${feeStats.overdue.toLocaleString()} (${feeStats.overduePct}%)`}
                />
              </div>

              {/* Legend & Stats */}
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Paid ({feeStats.paidPct}%)
                  </span>
                  <p className="text-sm sm:text-base font-black text-emerald-900 mt-0.5">
                    ₹{feeStats.paid.toLocaleString()}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/60">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    Pending ({feeStats.pendingPct}%)
                  </span>
                  <p className="text-sm sm:text-base font-black text-amber-900 mt-0.5">
                    ₹{feeStats.pending.toLocaleString()}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/60">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                    Overdue ({feeStats.overduePct}%)
                  </span>
                  <p className="text-sm sm:text-base font-black text-rose-900 mt-0.5">
                    ₹{feeStats.overdue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Operations: Class Mentorship & Dual Attendance Management */}
      {isAdmin && (
        <div className="space-y-6">
          <ClassMentorshipManager />
          <AdminAttendanceManager />
        </div>
      )}

      {/* Teacher Role View */}
      {isTeacher && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCard
              title="Assigned Classes"
              value={assignedClassCount}
              icon={School}
              trend="Active"
              trendPositive={true}
              subtitle="Subject Allocations"
              accentColor="blue"
              onClick={() => setCurrentPage('classes')}
            />
            <StatCard
              title="Mentored Students"
              value={mentoredClassStudents.length}
              icon={GraduationCap}
              trend="Roster"
              trendPositive={true}
              subtitle={teacherAssignments?.mentorship_class ? `${teacherAssignments.mentorship_class.name}-${teacherAssignments.mentorship_class.section}` : "None Assigned"}
              accentColor="emerald"
              onClick={() => setCurrentPage('students')}
            />
            <StatCard
              title="Scheduled Exams"
              value={exams.length}
              icon={FileSpreadsheet}
              trend="Active"
              trendPositive={true}
              subtitle="Term assessments"
              accentColor="indigo"
              onClick={() => setCurrentPage('exams')}
            />
            <StatCard
              title="Total Students"
              value={totalStudents}
              icon={Users}
              trend="Enrolled"
              trendPositive={true}
              subtitle="Academic Wing"
              accentColor="amber"
              onClick={() => setCurrentPage('classes')}
            />
          </div>

          {/* Teacher Mentorship and Teaching Assignments Sections */}
          <div className="space-y-6">
            {/* Section 1: My Mentorship Class */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 text-xs font-bold mb-1">
                    <Award className="w-3.5 h-3.5 text-blue-600" />
                    <span>Designated Class Mentorship</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">My Mentorship Class</h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    The primary class you mentor. You have full authorization to manage student registration and view class records.
                  </p>
                </div>

                {teacherAssignments?.mentorship_class && (
                  <button
                    onClick={() => setStudentModalOpen(true)}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Add Student to Mentored Class</span>
                  </button>
                )}
              </div>

              {teacherAssignments?.mentorship_class ? (
                <div className="mt-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-xs">
                        {teacherAssignments.mentorship_class.name.replace(/\D/g, '') || '10'}
                        {teacherAssignments.mentorship_class.section}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {teacherAssignments.mentorship_class.name} — Section {teacherAssignments.mentorship_class.section}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          Code: {teacherAssignments.mentorship_class.class_code} &bull; Mentor: {teacherAssignments.mentorship_class.mentor_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Class Mentor Authorized
                      </span>
                      <button
                        onClick={() => setCurrentPage('students')}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
                      >
                        View Full Directory
                      </button>
                    </div>
                  </div>

                  {/* Mentored Class Student Roster Preview */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 flex justify-between items-center border-b border-slate-200">
                      <span>Cohort Roster ({mentoredClassStudents.length} Students)</span>
                      <span className="text-[11px] text-slate-500 font-normal">Direct mentorship list</span>
                    </div>
                    {mentoredClassStudents.length > 0 ? (
                      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {mentoredClassStudents.map(s => (
                          <div key={s.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 text-xs transition-colors">
                            <div className="flex items-center space-x-2.5">
                              <span className="font-mono font-bold text-blue-600 text-[11px]">{s.rollNumber || s.roll_number || s.studentId}</span>
                              <span className="font-bold text-slate-900">{s.name}</span>
                              <span className="text-slate-400 font-normal text-[11px]">({s.email})</span>
                            </div>
                            <span className="font-mono text-slate-500 text-[11px]">{s.admission_number || s.admissionNumber || 'ADM-N/A'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No students enrolled in this class yet. Click "+ Add Student to Mentored Class" to register a student.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-6 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                  You are not currently designated as the mentor for any class. Contact the school administrator to assign you as a Class Mentor.
                </div>
              )}
            </div>

            {/* Section 2: My Teaching Assignments */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
              <div className="pb-4 border-b border-slate-100">
                <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-900 text-xs font-bold mb-1">
                  <School className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Subject Allocations</span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">My Teaching Assignments</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  All classes and sections where you teach your subjects, along with your student registration permissions.
                </p>
              </div>

              <div className="mt-4">
                {teacherAssignments?.teaching_assignments && teacherAssignments.teaching_assignments.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teacherAssignments.teaching_assignments.map((ta) => (
                      <div key={ta.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between hover:border-blue-400 transition-all">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                              {ta.subject}
                            </span>
                            {ta.can_add_students ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                Can Add Students
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                                Instruction Only
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {ta.class_name} — Section {ta.section}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Role: Subject Teacher &bull; {ta.can_add_students ? 'Authorized to register students' : 'Course instruction only'}
                          </p>
                        </div>

                        {ta.can_add_students && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <button
                              onClick={() => setStudentModalOpen(true)}
                              className="w-full py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center space-x-1 transition-colors"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>+ Register Student</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    No subject teaching assignments configured yet. The administrator can allocate your classes and subjects from the Classes & Allocations page.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Student Role View */}
      {isStudent && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <StatCard
              title="My Attendance"
              value={studentAttendance}
              icon={CheckCircle2}
              trend="Verified"
              trendPositive={true}
              subtitle="Daily presence rate"
              accentColor="emerald"
            />
            <StatCard
              title="Cumulative GPA"
              value={studentGpa}
              icon={Award}
              trend="Academic"
              trendPositive={true}
              subtitle="Score out of 4.0"
              accentColor="blue"
              onClick={() => setCurrentPage('exams')}
            />
            <StatCard
              title="Fee Clearance"
              value={studentFeeStatus}
              icon={Receipt}
              trend={studentFeeStatus === 'Paid' ? 'Cleared' : 'Pending'}
              trendPositive={studentFeeStatus === 'Paid'}
              subtitle="Academic Term"
              accentColor={studentFeeStatus === 'Paid' ? 'emerald' : 'amber'}
            />
            <StatCard
              title="Upcoming Exams"
              value={upcomingExamsList.length}
              icon={Calendar}
              trend="Scheduled"
              trendPositive={true}
              subtitle="Examinations"
              accentColor="indigo"
              onClick={() => setCurrentPage('exams')}
            />
          </div>

          {/* Student Academic Dossier Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900">Academic Registration Dossier</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Official enrollment identity and institutional standing
                </p>
              </div>
              <button
                onClick={() => setStudentDossierOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors border border-blue-200"
              >
                View Full Dossier
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Class & Section</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5">
                  {currentStudent?.grade || 'Grade 10'} — Section {currentStudent?.section || 'A'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Roll Number</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                  {currentStudent?.rollNumber || 'R-101'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admission Number</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                  {currentStudent?.admissionNumber || 'ADM-2024-001'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Guardian Contact</span>
                <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                  {currentStudent?.guardianName || 'Guardian'}
                </p>
              </div>
            </div>
          </div>

          {/* Upcoming Exams Table for Student */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-900">Upcoming Class Examinations</h2>
              <button
                onClick={() => setCurrentPage('exams')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span>Full Schedule</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {upcomingExamsList.length > 0 ? (
                upcomingExamsList.map(exam => (
                  <div key={exam.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{exam.name}</p>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Subject: {exam.subject} &bull; Max Marks: {exam.maxMarks || 100}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-700">{exam.date}</span>
                      <span className="block text-[10px] text-slate-400">{exam.term || 'Term 1'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  No upcoming examinations scheduled at this time.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Common Bottom Row: Campus Notices & Real-Time Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900">Institutional Activity Log</h2>
            <span className="text-xs text-slate-500 font-medium">Real-time system events</span>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {recentActivities.slice(0, 5).map((act) => (
              <div key={act.id} className="py-3 flex items-start space-x-3.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 mt-0.5 shrink-0 border border-blue-100">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate">{act.action}</p>
                    <span className="text-[11px] text-slate-400 font-semibold shrink-0">{act.time}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{act.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campus Announcements Board */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900">Campus Notices</h2>
            </div>
            <span className="text-[11px] font-bold text-slate-500">{notices.length} Active</span>
          </div>

          <div className="mt-4 space-y-3.5 flex-1 overflow-y-auto max-h-80">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Badge text={notice.category} variant="blue" size="xs" />
                  <span className="text-[10px] font-semibold text-slate-400">{notice.date}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{notice.title}</h4>
                <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">{notice.summary}</p>
                <span className="text-[10px] font-bold text-blue-700 mt-1.5 block">By {notice.author}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals - Role restricted */}
      {canAddStudent(currentUser) && (
        <AddStudentModal isOpen={studentModalOpen} onClose={() => setStudentModalOpen(false)} />
      )}

      {isAdmin && (
        <>
          <AddTeacherModal isOpen={teacherModalOpen} onClose={() => setTeacherModalOpen(false)} />
          <RecordFeeModal isOpen={feeModalOpen} onClose={() => setFeeModalOpen(false)} />
        </>
      )}

      {/* Student Profile Dossier Modal for Student role */}
      {isStudent && currentStudent && (
        <Modal
          isOpen={studentDossierOpen}
          onClose={() => setStudentDossierOpen(false)}
          title="Student Registration Dossier"
        >
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:space-x-4 pb-4 border-b border-slate-100">
              <img
                src={currentStudent.avatar || currentUser.avatar}
                alt={currentStudent.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-4 ring-blue-100 shrink-0"
              />
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">{currentStudent.name}</h3>
                <p className="text-xs text-slate-600 font-medium">
                  {currentStudent.grade} - Section {currentStudent.section} (Roll: {currentStudent.rollNumber})
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <Badge text={currentStudent.status} size="xs" />
                  <Badge text={`Fees: ${currentStudent.feesStatus}`} size="xs" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-bold text-[10px] uppercase">Student ID</span>
                <span className="font-mono font-bold text-slate-900 text-xs">{currentStudent.id}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-bold text-[10px] uppercase">Cumulative GPA</span>
                <span className="font-bold text-blue-700 text-xs">{currentStudent.gpa} / 4.0</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-bold text-[10px] uppercase">Attendance Rate</span>
                <span className="font-bold text-emerald-700 text-xs">{currentStudent.attendance}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block font-bold text-[10px] uppercase">Academic Enrollment</span>
                <span className="font-bold text-slate-900 text-xs">{currentStudent.admissionDate || '2024-09-01'}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
              <h4 className="font-extrabold text-slate-900">Registered Guardian Contact</h4>
              <p><span className="text-slate-500 font-medium">Guardian:</span> <span className="font-bold text-slate-900">{currentStudent.guardianName}</span></p>
              <p><span className="text-slate-500 font-medium">Phone:</span> <span className="font-bold text-slate-900">{currentStudent.guardianPhone}</span></p>
              <p><span className="text-slate-500 font-medium">Email:</span> <span className="font-bold text-slate-900">{currentStudent.email}</span></p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
