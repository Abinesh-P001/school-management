import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Award,
  Clock,
  CreditCard,
  FileText,
  Printer,
  AlertCircle,
  CheckCircle2,
  Send,
  Loader2,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import Badge from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import { getApiBaseUrl } from '../config/api';

export default function ParentChildDetailPage() {
  const {
    currentUser,
    parentChildren,
    activeChild,
    setActiveChild,
    authToken,
    showToast,
    schoolInfo
  } = useApp();

  const selectedChild = activeChild || parentChildren[0];
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance', 'exams', 'timetable', 'fees', 'correction'

  // Tab Data States
  const [attendanceData, setAttendanceData] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [timetableData, setTimetableData] = useState(null);
  const [feesData, setFeesData] = useState(null);
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timetable Selected Day
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Correction Request Form
  const [targetField, setTargetField] = useState('Phone Number');
  const [proposedValue, setProposedValue] = useState('');
  const [reason, setReason] = useState('');
  const [submittingCorr, setSubmittingCorr] = useState(false);

  // Report Card Printable Modal
  const [showReportCardModal, setShowReportCardModal] = useState(false);

  const token = authToken || localStorage.getItem('oakridge_auth_token');
  const backendBase = getApiBaseUrl();

  useEffect(() => {
    if (!selectedChild?.id) return;

    let isMounted = true;
    const fetchAllChildDetails = async () => {
      setLoading(true);
      try {
        const [attRes, resRes, timeRes, feeRes, corrRes] = await Promise.all([
          fetch(`${backendBase}/parent/children/${selectedChild.id}/attendance`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${backendBase}/parent/children/${selectedChild.id}/results`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${backendBase}/parent/children/${selectedChild.id}/timetable`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${backendBase}/parent/children/${selectedChild.id}/fees`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`${backendBase}/parent/profile-correction-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (isMounted) {
          if (attRes.ok) setAttendanceData(await attRes.json());
          if (resRes.ok) setResultsData(await resRes.json());
          if (timeRes.ok) setTimetableData(await timeRes.json());
          if (feeRes.ok) setFeesData(await feeRes.json());
          if (corrRes.ok) setCorrectionRequests(await corrRes.json());
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };

    fetchAllChildDetails();

    return () => {
      isMounted = false;
    };
  }, [selectedChild?.id, token]);

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!proposedValue.trim()) {
      showToast('Please enter the proposed value.', 'error');
      return;
    }

    setSubmittingCorr(true);
    try {
      const res = await fetch(`${backendBase}/parent/profile-correction-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: selectedChild.id,
          requested_field: targetField,
          current_value: targetField === 'Phone Number' ? selectedChild.guardian_phone : '',
          proposed_value: proposedValue.trim(),
          reason: reason.trim()
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to submit correction request.');
      }

      showToast('Correction request submitted! Administration will review your submission.');
      setProposedValue('');
      setReason('');

      // Refresh requests
      const corrRes = await fetch(`${backendBase}/parent/profile-correction-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (corrRes.ok) setCorrectionRequests(await corrRes.json());
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingCorr(false);
    }
  };

  const filteredTimetable = (timetableData?.timetable || []).filter(
    (p) => p.day_of_week.toLowerCase() === selectedDay.toLowerCase()
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Child Switcher & Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 mb-1">
            <span>Verified Student Dossier</span>
            <span>•</span>
            <span className="text-blue-700">Admission #{selectedChild?.admission_number || selectedChild?.student_id}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {selectedChild?.name || 'Student Profile'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Class & Section: <strong className="text-slate-800">{selectedChild?.grade} {selectedChild?.section ? `(${selectedChild?.section})` : ''}</strong> • Roll No: <strong className="text-slate-800">{selectedChild?.roll_number || 'N/A'}</strong>
          </p>
        </div>

        {/* Switch Child if multiple */}
        {parentChildren.length > 1 && (
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
            {parentChildren.map((child) => (
              <button
                key={child.id}
                onClick={() => setActiveChild(child)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedChild?.id === child.id
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'attendance'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Attendance Register</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'exams'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Exams & Report Cards</span>
        </button>

        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'timetable'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Class Timetable</span>
        </button>

        <button
          onClick={() => setActiveTab('fees')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'fees'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Fees & Billing</span>
        </button>

        <button
          onClick={() => setActiveTab('correction')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'correction'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Data Correction</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ATTENDANCE REGISTER */}
      {/* ============================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Overall Attendance</span>
              <p className="text-xl font-black text-blue-700 mt-1">
                {attendanceData?.attendance_rate || '100%'}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Days Present</span>
              <p className="text-xl font-black text-emerald-700 mt-1">
                {attendanceData?.present_days || 0}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Days Absent</span>
              <p className="text-xl font-black text-rose-700 mt-1">
                {attendanceData?.absent_days || 0}
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Late Arrivals</span>
              <p className="text-xl font-black text-amber-700 mt-1">
                {attendanceData?.late_days || 0}
              </p>
            </div>
          </div>

          {/* Daily Records Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">Official Daily Register (Recent 60 Days)</h3>
              <span className="text-xs text-slate-500 font-semibold">
                Recorded by Classroom Mentors
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(attendanceData?.history || []).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {new Date(row.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          row.status.toLowerCase() === 'present'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : row.status.toLowerCase() === 'absent'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {row.remarks || 'Regular Attendance Recorded'}
                      </td>
                    </tr>
                  ))}
                  {(!attendanceData?.history || attendanceData.history.length === 0) && (
                    <tr>
                      <td colSpan="3" className="text-center py-8 text-slate-400">
                        No attendance records logged for this student yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: EXAMS & REPORT CARDS */}
      {/* ============================================================== */}
      {activeTab === 'exams' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Published Examination Results</h3>
              <p className="text-xs text-slate-500">
                Only moderated and formally published results are displayed.
              </p>
            </div>
            {resultsData?.results?.length > 0 && (
              <button
                onClick={() => setShowReportCardModal(true)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>View & Print Report Card</span>
              </button>
            )}
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Examination</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4 text-center">Total Marks</th>
                    <th className="py-3 px-4 text-center">Marks Obtained</th>
                    <th className="py-3 px-4 text-center">Percentage</th>
                    <th className="py-3 px-4 text-center">Grade</th>
                    <th className="py-3 px-4 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(resultsData?.results || []).map((m) => (
                    <tr key={m.mark_id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {m.exam_name}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {m.exam_type} • {m.academic_year}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{m.subject}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-600">{m.total_marks}</td>
                      <td className="py-3 px-4 text-center font-black text-slate-900">{m.marks_obtained}</td>
                      <td className="py-3 px-4 text-center font-bold text-blue-700">{m.percentage}%</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-black text-[11px]">
                          {m.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          m.status.toLowerCase() === 'passed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!resultsData?.results || resultsData.results.length === 0) && (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-slate-400">
                        No published examination records are currently released for this student.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: TIMETABLE */}
      {/* ============================================================== */}
      {activeTab === 'timetable' && (
        <div className="space-y-5">
          {/* Day Selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDay.toLowerCase() === day.toLowerCase()
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Periods List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTimetable.map((period) => (
              <div
                key={period.id}
                className={`p-4 rounded-2xl border transition-all ${
                  period.is_break
                    ? 'bg-amber-50/50 border-amber-200 text-amber-900'
                    : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                  <span>Period {period.period_number}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                    {period.start_time} - {period.end_time}
                  </span>
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">{period.subject}</h4>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Instructor:</span>
                  <span className="font-bold text-slate-800">{period.teacher_name}</span>
                </div>
                {period.room && (
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                    <span>Location:</span>
                    <span className="font-semibold text-slate-700">{period.room}</span>
                  </div>
                )}
              </div>
            ))}
            {filteredTimetable.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No classes scheduled for {selectedDay}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: FEES & BILLING */}
      {/* ============================================================== */}
      {activeTab === 'fees' && (
        <div className="space-y-5">
          {/* Fee Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Invoiced</span>
              <p className="text-2xl font-black text-slate-900 mt-1">
                ${(feesData?.total_billed || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Settled</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                ${(feesData?.total_paid || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Remaining Balance</span>
              <p className={`text-2xl font-black mt-1 ${
                (feesData?.outstanding_balance || 0) > 0 ? 'text-rose-700' : 'text-emerald-700'
              }`}>
                ${(feesData?.outstanding_balance || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200">
              <h3 className="font-extrabold text-slate-900 text-sm">Tuition & Fee Statements</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Fee Description</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Settlement Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(feesData?.invoices || []).map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-blue-700">{inv.invoice_number}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{inv.fee_type}</td>
                      <td className="py-3 px-4 text-slate-500 font-semibold">{inv.due_date}</td>
                      <td className="py-3 px-4 font-black text-slate-900">${inv.amount.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          inv.status.toLowerCase() === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500 font-medium">
                        {inv.paid_date || 'Pending Payment'}
                      </td>
                    </tr>
                  ))}
                  {(!feesData?.invoices || feesData.invoices.length === 0) && (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-slate-400">
                        No fee invoices found for this academic period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: PROFILE CORRECTION REQUEST */}
      {/* ============================================================== */}
      {activeTab === 'correction' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submission Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-extrabold text-slate-900 text-sm mb-1">
              Submit Contact / Profile Correction
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              To protect student records, parents cannot edit institutional data directly. All changes undergo administrative review.
            </p>

            <form onSubmit={handleCorrectionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Field Requiring Update
                </label>
                <select
                  value={targetField}
                  onChange={(e) => setTargetField(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="Phone Number">Primary Contact / Phone Number</option>
                  <option value="Alternate Phone">Alternate Phone Number</option>
                  <option value="Residential Address">Residential Address</option>
                  <option value="Guardian Name">Guardian Name Spelling</option>
                  <option value="Emergency Contact">Emergency Contact Details</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Proposed Correct Value
                </label>
                <input
                  type="text"
                  value={proposedValue}
                  onChange={(e) => setProposedValue(e.target.value)}
                  placeholder="e.g. +1 (555) 345-6789 or 123 Academic Way"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Adjustment
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this change is necessary (e.g. moved residence, new cellular carrier)..."
                  rows="3"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={submittingCorr}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-xs disabled:opacity-50"
              >
                {submittingCorr ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Correction Request</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Past Requests History */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-extrabold text-slate-900 text-sm mb-1">
              Correction Requests History
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time audit status of submitted updates.
            </p>

            <div className="space-y-3">
              {correctionRequests.map((req) => (
                <div key={req.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{req.requested_field}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      req.status.toLowerCase() === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : req.status.toLowerCase() === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Proposed: <strong className="text-slate-900">{req.proposed_value}</strong>
                  </div>
                  {req.admin_notes && (
                    <div className="text-[10px] text-blue-700 font-semibold bg-blue-50 p-1.5 rounded">
                      Admin Note: {req.admin_notes}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400">
                    Submitted on: {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}

              {correctionRequests.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">
                  No correction requests submitted yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* REPORT CARD PRINTABLE MODAL */}
      {/* ============================================================== */}
      {showReportCardModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="text-center pb-4 border-b border-slate-200 space-y-1">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {schoolInfo?.name || 'Oakridge International School'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {schoolInfo?.address || 'Academic Blvd, CA'} • Official Term Academic Report
              </p>
            </div>

            {/* Student Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Student Name</span>
                <span className="font-extrabold text-slate-900">{selectedChild?.name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Student ID</span>
                <span className="font-bold text-slate-800">{selectedChild?.student_id}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Class / Grade</span>
                <span className="font-bold text-slate-800">{selectedChild?.grade} ({selectedChild?.section})</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Roll Number</span>
                <span className="font-bold text-slate-800">{selectedChild?.roll_number}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Attendance Rate</span>
                <span className="font-bold text-emerald-700">{attendanceData?.attendance_rate || '98%'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px]">Issue Date</span>
                <span className="font-semibold text-slate-700">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Marks Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3 text-center">Max Marks</th>
                    <th className="py-2.5 px-3 text-center">Passing</th>
                    <th className="py-2.5 px-3 text-center">Marks Obtained</th>
                    <th className="py-2.5 px-3 text-center">Grade</th>
                    <th className="py-2.5 px-3 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(resultsData?.results || []).map((m) => (
                    <tr key={m.mark_id}>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{m.subject}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{m.total_marks}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{m.passing_marks}</td>
                      <td className="py-2.5 px-3 text-center font-black text-slate-900">{m.marks_obtained}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-700">{m.grade}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowReportCardModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

