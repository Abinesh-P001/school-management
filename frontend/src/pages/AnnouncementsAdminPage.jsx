import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  PlusCircle,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  Archive,
  Paperclip,
  Loader2,
  X,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getApiBaseUrl } from '../config/api';
import { isUserAdmin, isUserTeacher, isClassAssignedToTeacher } from '../utils/permissions';

export default function AnnouncementsAdminPage() {
  const { authToken, showToast, classes, currentUser, teacherAssignments, currentTeacher } = useApp();
  const isAdmin = isUserAdmin(currentUser);
  const isTeacher = isUserTeacher(currentUser);

  // For faculty, announcements must be scoped to their assigned classes
  const authorizedClasses = useMemo(() => {
    if (!isTeacher) return classes;
    return classes.filter(c => isClassAssignedToTeacher(c.id, teacherAssignments, currentTeacher));
  }, [classes, isTeacher, teacherAssignments, currentTeacher]);

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('Normal');
  const [targetAudience, setTargetAudience] = useState(isTeacher ? 'PARENTS_CLASS' : 'ALL');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetGrade, setTargetGrade] = useState('Grade 10');
  const [statusVal, setStatusVal] = useState('Published');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const token = authToken || localStorage.getItem('oakridge_auth_token');
  const backendBase = getApiBaseUrl();

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendBase}/announcements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAnnouncements(await res.json());
      }
    } catch (err) {
      showToast('Error loading school announcements.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [token]);

  const handleOpenAdd = () => {
    setEditingAnnouncement(null);
    setTitle('');
    setContent('');
    setCategory('General');
    setPriority('Normal');
    if (isTeacher) {
      setTargetAudience('PARENTS_CLASS');
      setTargetClassId(authorizedClasses[0]?.id ? String(authorizedClasses[0].id) : '');
    } else {
      setTargetAudience('ALL');
      setTargetClassId('');
    }
    setTargetGrade('Grade 10');
    setStatusVal('Published');
    setAttachmentName('');
    setAttachmentUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ann) => {
    setEditingAnnouncement(ann);
    setTitle(ann.title);
    setContent(ann.content);
    setCategory(ann.category);
    setPriority(ann.priority);
    setTargetAudience(ann.target_audience || (isTeacher ? 'PARENTS_CLASS' : 'ALL'));
    setTargetClassId(ann.target_class_id ? String(ann.target_class_id) : (authorizedClasses[0]?.id ? String(authorizedClasses[0].id) : ''));
    setTargetGrade(ann.target_grade || 'Grade 10');
    setStatusVal(ann.status);
    setAttachmentName(ann.attachment_name || '');
    setAttachmentUrl(ann.attachment_url || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const audience = isTeacher ? 'PARENTS_CLASS' : targetAudience;
      const classIdNum = (isTeacher || audience === 'PARENTS_CLASS') && targetClassId ? Number(targetClassId) : null;

      const payload = {
        title: title.trim(),
        content: content.trim(),
        category,
        priority,
        target_audience: audience,
        target_class_id: classIdNum,
        target_grade: (!isTeacher && audience === 'PARENTS_GRADE') ? targetGrade : null,
        status: statusVal,
        is_published: statusVal === 'Published',
        attachment_name: attachmentName.trim() || null,
        attachment_url: attachmentUrl.trim() || null
      };

      const url = editingAnnouncement
        ? `${backendBase}/announcements/${editingAnnouncement.id}`
        : `${backendBase}/announcements`;
      const method = editingAnnouncement ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to save announcement.');
      }

      showToast(`Announcement ${editingAnnouncement ? 'updated' : 'published'} successfully!`);
      setIsModalOpen(false);
      loadAnnouncements();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      const res = await fetch(`${backendBase}/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete announcement.');
      showToast('Announcement removed.');
      loadAnnouncements();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await fetch(`${backendBase}/announcements/${id}/toggle-status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to update status.');
      const data = await res.json();
      showToast(data.message);
      loadAnnouncements();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filtered = announcements.filter((ann) => {
    const query = searchQuery.toLowerCase();
    const matchQuery =
      ann.title.toLowerCase().includes(query) ||
      ann.content.toLowerCase().includes(query);
    const matchCategory =
      selectedCategory === 'All' || ann.category === selectedCategory;
    return matchQuery && matchCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            School Announcements & Bulletins Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Author and broadcast institutional notices, target specific audiences (All, Parents, Grade, Faculty), and monitor delivery.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Create Announcement</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bulletins by title, keyword, or audience..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 transition-all"
          />
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-blue-600"
          >
            <option value="All">All Categories</option>
            <option value="Academic">Academic</option>
            <option value="Event">Event</option>
            <option value="Emergency">Emergency</option>
            <option value="General">General</option>
          </select>
        </div>
      </div>

      {/* Announcements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Title & Details</th>
                <th className="py-3 px-4">Target Audience</th>
                <th className="py-3 px-4">Priority & Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Published Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((ann) => (
                <tr key={ann.id} className="hover:bg-slate-50/50">
                  {/* Title & Preview */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-extrabold text-slate-900 line-clamp-1">{ann.title}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{ann.content}</div>
                    {ann.attachment_name && (
                      <div className="inline-flex items-center space-x-1 text-blue-600 text-[10px] font-bold mt-1">
                        <Paperclip className="w-3 h-3" />
                        <span>{ann.attachment_name}</span>
                      </div>
                    )}
                  </td>

                  {/* Target Audience */}
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[10px] border border-blue-200">
                      {ann.target_audience === 'PARENTS_GRADE'
                        ? `Parents: ${ann.target_grade || 'Grade'}`
                        : ann.target_audience === 'PARENTS_ALL'
                        ? 'All Parents'
                        : ann.target_audience === 'TEACHERS_ALL'
                        ? 'Faculty Only'
                        : 'School-Wide (All)'}
                    </span>
                  </td>

                  {/* Priority & Category */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-slate-800">{ann.category}</span>
                      <span>•</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                        ann.priority.toLowerCase() === 'urgent'
                          ? 'bg-rose-100 text-rose-800'
                          : ann.priority.toLowerCase() === 'high'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {ann.priority}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      ann.status === 'Published'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : ann.status === 'Draft'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {ann.status}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-slate-500 font-medium">
                    {new Date(ann.publish_date).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right space-x-1.5">
                    {(isAdmin || ann.created_by === currentUser?.id) ? (
                      <>
                        <button
                          onClick={() => handleToggleStatus(ann.id)}
                          className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
                          title={ann.status === 'Published' ? 'Archive announcement' : 'Publish announcement'}
                        >
                          {ann.status === 'Published' ? 'Archive' : 'Publish'}
                        </button>
                        <button
                          onClick={() => handleOpenEdit(ann)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ann.id)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-rose-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 italic">Read-only</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400">
                    No announcements recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: CREATE OR EDIT ANNOUNCEMENT */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                {editingAnnouncement ? 'Edit Announcement' : 'Author School Announcement'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bulletin Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Annual Sports Day Schedule & Transportation Details"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Announcement Content</label>
                <textarea
                  required
                  rows="4"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Draft clear, professional announcement text..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="General">General</option>
                    <option value="Academic">Academic</option>
                    <option value="Exam">Exam</option>
                    <option value="Sports">Sports</option>
                    <option value="Event">Event</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {isTeacher ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Target Assigned Class</label>
                    <select
                      value={targetClassId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600"
                    >
                      {authorizedClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={statusVal}
                      onChange={(e) => setStatusVal(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600"
                    >
                      <option value="Published">Published Immediately</option>
                      <option value="Draft">Draft (Hidden)</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Target Audience</label>
                      <select
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600"
                      >
                        <option value="ALL">School-Wide (Everyone)</option>
                        <option value="PARENTS_ALL">All Parents & Guardians</option>
                        <option value="PARENTS_GRADE">Parents of Specific Grade</option>
                        <option value="PARENTS_CLASS">Class Specific</option>
                        <option value="TEACHERS_ALL">Faculty & Academic Staff</option>
                        <option value="STUDENTS_ALL">Students Only</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                      <select
                        value={statusVal}
                        onChange={(e) => setStatusVal(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600"
                      >
                        <option value="Published">Published Immediately</option>
                        <option value="Draft">Draft (Hidden)</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  {targetAudience === 'PARENTS_GRADE' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Target Grade</label>
                      <select
                        value={targetGrade}
                        onChange={(e) => setTargetGrade(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600"
                      >
                        <option value="Grade 9">Grade 9</option>
                        <option value="Grade 10">Grade 10</option>
                        <option value="Grade 11">Grade 11</option>
                        <option value="Grade 12">Grade 12</option>
                      </select>
                    </div>
                  )}

                  {targetAudience === 'PARENTS_CLASS' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Target Class</label>
                      <select
                        value={targetClassId}
                        onChange={(e) => setTargetClassId(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-blue-600"
                      >
                        <option value="">Select a class...</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{c.name} - Section {c.section}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Attachment File Name (Optional)</label>
                <input
                  type="text"
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  placeholder="e.g. Term_Schedule_2026.pdf"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Publish Bulletin</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

