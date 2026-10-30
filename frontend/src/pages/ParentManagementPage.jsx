import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Unlink,
  FileText,
  AlertCircle,
  Loader2,
  Check,
  X
} from 'lucide-react';
import Badge from '../components/common/Badge';
import { useApp } from '../context/AppContext';
import { getApiBaseUrl } from '../config/api';

export default function ParentManagementPage() {
  const { authToken, showToast, students } = useApp();

  const [parents, setParents] = useState([]);
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('parents'); // 'parents' or 'corrections'
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddParentOpen, setIsAddParentOpen] = useState(false);
  const [isLinkStudentOpen, setIsLinkStudentOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);

  // New Parent Form
  const [newParentName, setNewParentName] = useState('');
  const [newParentEmail, setNewParentEmail] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');
  const [newParentRel, setNewParentRel] = useState('Father');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [savingParent, setSavingParent] = useState(false);

  // Link Student Form
  const [studentToLink, setStudentToLink] = useState('');
  const [linkRel, setLinkRel] = useState('Parent');

  // Reset Password Form
  const [newPassword, setNewPassword] = useState('ParentSecure123!');
  const [resettingPw, setResettingPw] = useState(false);

  const token = authToken || localStorage.getItem('oakridge_auth_token');
  const backendBase = getApiBaseUrl();

  const loadData = async () => {
    setLoading(true);
    try {
      const [parentsRes, corrRes] = await Promise.all([
        fetch(`${backendBase}/admin/parents`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${backendBase}/admin/parents/correction-requests/all`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (parentsRes.ok) setParents(await parentsRes.json());
      if (corrRes.ok) setCorrectionRequests(await corrRes.json());
    } catch (err) {
      showToast('Error loading parent records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleCreateParent = async (e) => {
    e.preventDefault();
    setSavingParent(true);
    try {
      const res = await fetch(`${backendBase}/admin/parents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newParentName.trim(),
          email: newParentEmail.trim(),
          phone: newParentPhone.trim(),
          relationship_type: newParentRel,
          student_ids: selectedStudentIds
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create parent account.');
      }

      showToast(`Parent account for ${newParentName} registered successfully!`);
      setIsAddParentOpen(false);
      setNewParentName('');
      setNewParentEmail('');
      setNewParentPhone('');
      setSelectedStudentIds([]);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingParent(false);
    }
  };

  const handleLinkStudent = async (e) => {
    e.preventDefault();
    if (!studentToLink || !selectedParent) return;

    try {
      const res = await fetch(`${backendBase}/admin/parents/${selectedParent.id}/link-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: Number(studentToLink),
          relationship: linkRel,
          is_primary_contact: true,
          is_verified: true
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to link student.');
      }

      showToast('Student successfully linked to parent profile!');
      setIsLinkStudentOpen(false);
      setStudentToLink('');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUnlinkStudent = async (parentId, studentId) => {
    if (!window.confirm('Are you sure you want to unlink this student from the parent profile?')) return;
    try {
      const res = await fetch(`${backendBase}/admin/parents/${parentId}/unlink-student/${studentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to unlink student.');
      showToast('Student unlinked successfully.');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleStatus = async (parentId) => {
    try {
      const res = await fetch(`${backendBase}/admin/parents/${parentId}/toggle-status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to update status.');
      const data = await res.json();
      showToast(data.message);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedParent) return;
    setResettingPw(true);
    try {
      const res = await fetch(`${backendBase}/admin/parents/${selectedParent.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ new_password: newPassword })
      });
      if (!res.ok) throw new Error('Password reset failed.');
      showToast(`Password updated for ${selectedParent.name}!`);
      setIsResetPasswordOpen(false);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResettingPw(false);
    }
  };

  const handleResolveCorrection = async (requestId, newStatus) => {
    const adminNote = prompt(`Enter review notes for marking request as ${newStatus}:`, 'Verified and approved by administration');
    if (adminNote === null) return;

    try {
      const res = await fetch(`${backendBase}/admin/parents/correction-requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, admin_notes: adminNote })
      });
      if (!res.ok) throw new Error('Failed to update request.');
      showToast(`Correction request ${newStatus}!`);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredParents = parents.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.email.toLowerCase().includes(query) ||
      p.parent_code.toLowerCase().includes(query) ||
      p.phone.includes(query) ||
      (p.students || []).some(s => s.name.toLowerCase().includes(query))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Parent & Guardian Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Register parent accounts, link student records, manage portal credentials, and audit profile correction requests.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddParentOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Register Parent</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('parents')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'parents'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>Parent Directory ({parents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('corrections')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'corrections'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>Correction Requests</span>
          {correctionRequests.filter(r => r.status === 'Pending').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {correctionRequests.filter(r => r.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PARENTS DIRECTORY */}
      {/* ============================================================== */}
      {activeTab === 'parents' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parents by name, email, code, or linked student name..."
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-600 shadow-xs"
            />
          </div>

          {/* Parents Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">Parent / Guardian</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4">Linked Students</th>
                    <th className="py-3 px-4">Portal Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParents.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {p.parent_code} • {p.relationship_type}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{p.email}</div>
                        <div className="text-[11px] text-slate-500">{p.phone}</div>
                      </td>

                      {/* Linked Children */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                          {(p.students || []).map((st) => (
                            <span
                              key={st.id}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-bold text-[10px]"
                            >
                              <span>{st.name} ({st.grade || 'Student'})</span>
                              <button
                                onClick={() => handleUnlinkStudent(p.id, st.id)}
                                title="Unlink Student"
                                className="text-rose-500 hover:text-rose-700 ml-1"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <button
                            onClick={() => {
                              setSelectedParent(p);
                              setIsLinkStudentOpen(true);
                            }}
                            className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors"
                          >
                            + Link
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          p.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {p.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleToggleStatus(p.id)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
                        >
                          {p.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedParent(p);
                            setIsResetPasswordOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition-colors"
                        >
                          Reset Pwd
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredParents.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-12 text-slate-400">
                        No parent records found matching your query.
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
      {/* TAB 2: CORRECTION REQUESTS AUDIT */}
      {/* ============================================================== */}
      {activeTab === 'corrections' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Parent / Student</th>
                  <th className="py-3 px-4">Field</th>
                  <th className="py-3 px-4">Proposed Value</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {correctionRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.parent_name}</div>
                      <div className="text-[11px] text-slate-500">For student: {r.student_name}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-700">{r.requested_field}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.proposed_value}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{r.reason || 'None provided'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        r.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {r.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => handleResolveCorrection(r.id, 'Approved')}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleResolveCorrection(r.id, 'Rejected')}
                            className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-slate-400 font-medium text-[11px]">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {correctionRequests.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-400">
                      No parent correction requests submitted.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REGISTER NEW PARENT */}
      {/* ============================================================== */}
      {isAddParentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Register Parent / Guardian</h3>
              <button onClick={() => setIsAddParentOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateParent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  placeholder="e.g. Wei Chen or Sarah Connor"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newParentEmail}
                  onChange={(e) => setNewParentEmail(e.target.value)}
                  placeholder="parent.chen@example.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newParentPhone}
                    onChange={(e) => setNewParentPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                  <select
                    value={newParentRel}
                    onChange={(e) => setNewParentRel(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Sponsor">Sponsor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Link Initial Student(s)</label>
                <select
                  multiple
                  value={selectedStudentIds.map(String)}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => Number(option.value));
                    setSelectedStudentIds(values);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600 h-28"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.grade || 'Grade'} - {st.student_id})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Hold Ctrl (Windows) to select multiple students.</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddParentOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingParent}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
                >
                  {savingParent ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: LINK STUDENT */}
      {/* ============================================================== */}
      {isLinkStudentOpen && selectedParent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                Link Student to {selectedParent.name}
              </h3>
              <button onClick={() => setIsLinkStudentOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLinkStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Student</label>
                <select
                  required
                  value={studentToLink}
                  onChange={(e) => setStudentToLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.student_id} • {st.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                <select
                  value={linkRel}
                  onChange={(e) => setLinkRel(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                  <option value="Parent">Parent</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsLinkStudentOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                >
                  Link Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RESET PASSWORD */}
      {/* ============================================================== */}
      {isResetPasswordOpen && selectedParent && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Reset Password</h3>
              <button onClick={() => setIsResetPasswordOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-xs text-slate-500">
                Set a new password for <strong>{selectedParent.email}</strong>.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Secure Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsResetPasswordOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resettingPw}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                >
                  {resettingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Update Password</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

