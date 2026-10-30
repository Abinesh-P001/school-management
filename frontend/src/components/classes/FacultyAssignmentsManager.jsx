import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  BookOpen,
  UserCheck,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Trash2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  School
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getApiBaseUrl } from '../../config/api';

export default function FacultyAssignmentsManager() {
  const { authToken, teachers, classes, showToast, refreshData } = useApp();

  const [activeTab, setActiveTab] = useState('mentors'); // 'mentors' | 'subjects'
  const [loading, setLoading] = useState(false);
  const [mentorsList, setMentorsList] = useState([]);
  const [subjectAssignments, setSubjectAssignments] = useState([]);

  // Form state for creating a subject assignment
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formCanAddStudents, setFormCanAddStudents] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const backendBase = getApiBaseUrl();

  const fetchMentors = useCallback(async () => {
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const res = await fetch(`${backendBase}/assignments/classes/mentors`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setMentorsList(data);
      }
    } catch (err) {
      console.warn('Error fetching mentors:', err);
    }
  }, [authToken, backendBase]);

  const fetchSubjectAssignments = useCallback(async () => {
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const res = await fetch(`${backendBase}/assignments/subjects`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setSubjectAssignments(data);
      }
    } catch (err) {
      console.warn('Error fetching subject assignments:', err);
    }
  }, [authToken, backendBase]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMentors(), fetchSubjectAssignments()]).finally(() => setLoading(false));
  }, [fetchMentors, fetchSubjectAssignments]);

  // Handle class mentor change
  const handleAssignMentor = async (classId, teacherId) => {
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const payload = { teacher_id: teacherId ? Number(teacherId) : null };
      const res = await fetch(`${backendBase}/assignments/classes/${classId}/mentor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update mentor assignment.');
      }

      showToast('Class mentor assignment updated successfully!', 'success');
      await fetchMentors();
      if (refreshData) refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle new subject assignment submission
  const handleCreateSubjectAssignment = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formTeacherId || !formClassId || !formSubject.trim()) {
      setFormError('Please select a teacher, a class, and enter a subject name.');
      return;
    }

    setFormSubmitting(true);
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const payload = {
        teacher_id: Number(formTeacherId),
        class_id: Number(formClassId),
        subject: formSubject.trim(),
        can_add_students: formCanAddStudents
      };

      const res = await fetch(`${backendBase}/assignments/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to assign subject.');
      }

      showToast('Subject teaching assignment created successfully!', 'success');
      setFormSubject('');
      setFormCanAddStudents(false);
      setShowAddSubjectModal(false);
      await fetchSubjectAssignments();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle student registration permission for subject teacher
  const handleToggleCanAddStudents = async (assignmentId, currentVal) => {
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const res = await fetch(`${backendBase}/assignments/subjects/${assignmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ can_add_students: !currentVal })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to update permission.');
      }

      showToast(`Student registration permission ${!currentVal ? 'granted' : 'revoked'}.`, 'info');
      await fetchSubjectAssignments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Delete subject assignment
  const handleDeleteSubjectAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this subject assignment?')) return;
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const res = await fetch(`${backendBase}/assignments/subjects/${assignmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to delete assignment.');
      }

      showToast('Subject assignment removed.', 'info');
      await fetchSubjectAssignments();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('mentors')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'mentors'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Class Mentorship Allocations ({mentorsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'subjects'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Subject Teaching Assignments ({subjectAssignments.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center">
          <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-600" />
          <span className="text-xs font-medium">Loading faculty allocations...</span>
        </div>
      ) : activeTab === 'mentors' ? (
        /* TAB 1: Class Mentors Assignment */
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
              <Award className="w-4 h-4 text-blue-600" />
              <span>Designated Class Mentors</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Each class and section has exactly one designated class mentor. A teacher can only mentor one class at a time.
              Reassigning an already assigned mentor will automatically update the previous class.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Class Code</th>
                  <th className="py-3 px-4">Class & Section</th>
                  <th className="py-3 px-4">Current Mentor</th>
                  <th className="py-3 px-4">Mentor Email</th>
                  <th className="py-3 px-4 text-right">Assign / Reassign Mentor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {mentorsList.map((m) => (
                  <tr key={m.class_id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{m.class_code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {m.name} — Section {m.section}
                    </td>
                    <td className="py-3 px-4">
                      {m.mentor_name ? (
                        <span className="inline-flex items-center space-x-1.5 font-bold text-slate-900">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{m.mentor_name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{m.mentor_email || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <select
                        value={m.mentor_id || ''}
                        onChange={(e) => handleAssignMentor(m.class_id, e.target.value)}
                        className="py-1.5 px-2.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="">(No Mentor)</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.department})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* TAB 2: Subject Teaching Assignments */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Subject Teaching Allocations</span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Assign teachers to subjects across multiple classes, and control whether they can register students for those classes.
              </p>
            </div>
            <button
              onClick={() => {
                setFormTeacherId(teachers[0]?.id || '');
                setFormClassId(classes[0]?.id || '');
                setFormSubject('');
                setFormCanAddStudents(false);
                setFormError('');
                setShowAddSubjectModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Allocate Subject Teacher</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Faculty Member</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Class & Section</th>
                    <th className="py-3 px-4 text-center">Student Registration Permission</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {subjectAssignments.length > 0 ? (
                    subjectAssignments.map((sa) => (
                      <tr key={sa.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{sa.teacher_name}</span>
                          <span className="text-[11px] text-slate-500">{sa.teacher_email}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                            {sa.subject}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {sa.class_name} — Section {sa.section}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleCanAddStudents(sa.id, sa.can_add_students)}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                              sa.can_add_students
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Click to toggle permission to add students"
                          >
                            {sa.can_add_students ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Can Add Students</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                                <span>Instructional Only</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteSubjectAssignment(sa.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove Subject Assignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                        No subject assignments allocated yet. Click &quot;+ Allocate Subject Teacher&quot; above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Allocate Subject Teacher */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-300 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-900">Allocate Subject Teacher</h3>
              <button
                onClick={() => setShowAddSubjectModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubjectAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Select Faculty Teacher</label>
                <select
                  value={formTeacherId}
                  onChange={(e) => setFormTeacherId(e.target.value)}
                  required
                  className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.department} / {t.subject || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Select Class & Section</label>
                <select
                  value={formClassId}
                  onChange={(e) => setFormClassId(e.target.value)}
                  required
                  className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — Section {c.section} (Room: {c.room || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics, AP Physics, Chemistry"
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="canAddCheckbox"
                  checked={formCanAddStudents}
                  onChange={(e) => setFormCanAddStudents(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="canAddCheckbox" className="text-xs text-slate-700 cursor-pointer">
                  <span className="font-bold block text-slate-900">Authorize Teacher to Add Students</span>
                  <span>Allow this subject teacher to enroll new students into this specific class and section.</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5"
                >
                  {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Allocation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

