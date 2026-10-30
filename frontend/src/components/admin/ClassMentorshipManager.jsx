import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  UserCheck,
  UserPlus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  ShieldAlert,
  School,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getApiBaseUrl } from '../../config/api';

export default function ClassMentorshipManager() {
  const { authToken, teachers, classes, showToast, refreshData } = useApp();

  const [mentorsList, setMentorsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for Assign / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modal State for Remove Confirmation
  const [removeConfirmTarget, setRemoveConfirmTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  const backendBase = getApiBaseUrl();

  const fetchMentors = useCallback(async () => {
    setLoading(true);
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
      console.warn('Error fetching class mentors:', err);
    } finally {
      setLoading(false);
    }
  }, [authToken, backendBase]);

  useEffect(() => {
    fetchMentors();
  }, [fetchMentors]);

  // Open modal to Assign or Edit/Replace mentor
  const handleOpenAssignModal = (targetClass) => {
    setSelectedClass(targetClass);
    setSelectedTeacherId(targetClass.mentor_id ? String(targetClass.mentor_id) : '');
    setErrorMessage('');
    setIsModalOpen(true);
  };

  // Check if selected teacher mentors another class
  const existingMentoredClass = mentorsList.find(
    (m) =>
      selectedTeacherId &&
      String(m.mentor_id) === String(selectedTeacherId) &&
      m.class_id !== selectedClass?.class_id
  );

  // Submit Assign / Update Mentorship
  const handleSubmitMentorship = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedClass) {
      setErrorMessage('No class selected.');
      return;
    }

    if (!selectedTeacherId) {
      setErrorMessage('Please select a teacher to assign as mentor.');
      return;
    }

    setSubmitting(true);
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const res = await fetch(`${backendBase}/assignments/classes/${selectedClass.class_id}/mentor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ teacher_id: Number(selectedTeacherId) })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to assign class mentor.');
      }

      const assignedTeacher = teachers.find(t => String(t.id) === String(selectedTeacherId));
      showToast(
        `Successfully ${selectedClass.mentor_id ? 'updated' : 'assigned'} ${assignedTeacher?.name || 'teacher'} as mentor for ${selectedClass.name} - Section ${selectedClass.section}!`,
        'success'
      );

      setIsModalOpen(false);
      await fetchMentors();
      if (refreshData) refreshData();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Remove Mentor
  const handleConfirmRemove = async () => {
    if (!removeConfirmTarget) return;

    setRemoving(true);
    try {
      const token = authToken || localStorage.getItem('oakridge_auth_token');
      const res = await fetch(`${backendBase}/assignments/classes/${removeConfirmTarget.class_id}/mentor`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to remove mentor assignment.');
      }

      showToast(
        `Mentor assignment removed for ${removeConfirmTarget.name} - Section ${removeConfirmTarget.section}. Teacher and student records remain intact.`,
        'info'
      );
      setRemoveConfirmTarget(null);
      await fetchMentors();
      if (refreshData) refreshData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setRemoving(false);
    }
  };

  const filteredMentors = mentorsList.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.name?.toLowerCase().includes(q) ||
      m.section?.toLowerCase().includes(q) ||
      m.mentor_name?.toLowerCase().includes(q) ||
      m.mentor_email?.toLowerCase().includes(q) ||
      m.class_code?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-bold mb-1">
            <Award className="w-3.5 h-3.5 text-blue-700" />
            <span>Academic Faculty Allocation</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            Class Mentorship Management
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-0.5">
            Assign designated class mentors to oversee student cohorts. Each class has one mentor, and a teacher can mentor only one class at a time.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search class, section, or mentor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Class</th>
              <th className="py-3 px-4">Section</th>
              <th className="py-3 px-4">Current Mentor</th>
              <th className="py-3 px-4">Mentor Email</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                  <span>Loading class mentorship assignments...</span>
                </td>
              </tr>
            ) : filteredMentors.length > 0 ? (
              filteredMentors.map((cls) => {
                const hasMentor = Boolean(cls.mentor_id && cls.mentor_name);

                return (
                  <tr key={cls.class_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <School className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{cls.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 font-normal">({cls.class_code})</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-blue-700">
                      Section {cls.section}
                    </td>
                    <td className="py-3.5 px-4">
                      {hasMentor ? (
                        <span className="inline-flex items-center space-x-1.5 font-bold text-slate-900 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{cls.mentor_name}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {cls.mentor_email || <span className="text-slate-400 italic">None</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center space-x-1.5 justify-end">
                        {!hasMentor ? (
                          <button
                            onClick={() => handleOpenAssignModal(cls)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Assign</span>
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenAssignModal(cls)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition-colors"
                              title="Edit / Replace Mentor"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-600" />
                              <span>Edit / Update</span>
                            </button>

                            <button
                              onClick={() => setRemoveConfirmTarget(cls)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors"
                              title="Remove Mentor Assignment"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Remove</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                  No classes match your search query.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Assign or Edit Mentor */}
      {isModalOpen && selectedClass && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-300 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900">
                  {selectedClass.mentor_id ? 'Update Class Mentor' : 'Assign Class Mentor'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitMentorship} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Target Class:</span>
                  <span className="font-bold text-slate-900">{selectedClass.name} — Section {selectedClass.section}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Class Code:</span>
                  <span className="font-mono font-bold text-blue-700">{selectedClass.class_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Current Mentor:</span>
                  <span className="font-semibold text-slate-800">{selectedClass.mentor_name || 'Unassigned'}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Select Faculty Teacher <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">-- Choose Faculty Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.department} / {t.subject || 'Faculty'}) {t.employeeId ? `[${t.employeeId}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conflict / Reassignment notice */}
              {existingMentoredClass && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 font-medium flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="font-bold block text-amber-950">Automatic Reassignment Notice:</strong>
                    This teacher is currently the mentor of <strong>{existingMentoredClass.name} - Section {existingMentoredClass.section}</strong>.
                    Since each teacher can mentor only one class at a time, assigning them here will automatically update their previous mentorship.
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{selectedClass.mentor_id ? 'Update Mentor' : 'Assign Mentor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Remove Mentor */}
      {removeConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-300 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">Remove Class Mentor?</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Are you sure you want to remove <strong>{removeConfirmTarget.mentor_name}</strong> as mentor of <strong>{removeConfirmTarget.name} - Section {removeConfirmTarget.section}</strong>?
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Teacher and student records will remain completely intact.
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRemoveConfirmTarget(null)}
                className="w-1/2 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={removing}
                className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-sm transition-all"
              >
                {removing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

