import { useState } from 'react';
import {
  Users,
  Mail,
  User,
  BookOpen,
  School,
  IdCard,
  Lock,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  ExternalLink
} from 'lucide-react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { createTeacherAccount } from '../../services/adminService';

const AVAILABLE_CLASSES = [
  'Grade 9-A',
  'Grade 9-B',
  'Grade 10-A',
  'Grade 10-B',
  'Grade 11-A',
  'Grade 11-B',
  'Grade 12-A',
  'Grade 12-B'
];

export default function AddTeacherModal({ isOpen, onClose }) {
  const { authToken, showToast, setTeachers, setRecentActivities } = useApp();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    teacherId: `TCH-${Math.floor(1000 + Math.random() * 9000)}`,
    subject: '',
    assignedClasses: ['Grade 10-A'],
    password: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdResult, setCreatedResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const toggleClassSelection = (cls) => {
    setFormData(prev => {
      const exists = prev.assignedClasses.includes(cls);
      const updated = exists
        ? prev.assignedClasses.filter(c => c !== cls)
        : [...prev.assignedClasses, cls];
      return { ...prev, assignedClasses: updated.length ? updated : [cls] };
    });
  };

  const handleResetAndClose = () => {
    setFormData({
      fullName: '',
      email: '',
      teacherId: `TCH-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: '',
      assignedClasses: ['Grade 10-A'],
      password: ''
    });
    setErrorMessage('');
    setCreatedResult(null);
    setCopiedLink(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.teacherId.trim() || !formData.subject.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (!formData.assignedClasses.length) {
      setErrorMessage('Please assign at least one class and section.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        teacher_id: formData.teacherId.trim(),
        subject: formData.subject.trim(),
        assigned_classes: formData.assignedClasses,
        password: formData.password || undefined
      };

      const result = await createTeacherAccount(payload, authToken);
      setCreatedResult(result);

      // Optimistically update local teacher list
      const newTeacher = {
        id: result.id,
        employeeId: result.teacher_id,
        employee_id: result.teacher_id,
        name: result.full_name,
        email: result.email,
        subject: formData.subject,
        department: 'Academics',
        classesAssigned: result.assigned_classes,
        classes_assigned: result.assigned_classes.join(', '),
        status: 'Active',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
      };
      setTeachers(prev => [newTeacher, ...prev]);

      // Log activity
      setRecentActivities(prev => [{
        id: Date.now(),
        action: "Faculty Member Onboarded",
        detail: `${result.full_name} (${result.teacher_id}) assigned to ${result.assigned_classes.join(', ')}`,
        time: "Just now",
        type: "teacher"
      }, ...prev]);

      showToast(`Teacher account created for ${result.full_name}! Invitation link generated.`, 'success');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create teacher account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInvitationLink = () => {
    if (createdResult?.invitation_link) {
      navigator.clipboard.writeText(createdResult.invitation_link);
      setCopiedLink(true);
      showToast('Invitation link copied to clipboard!', 'info');
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={createdResult ? "Teacher Invitation Ready" : "Add Teacher Account"}
      subtitle={createdResult ? "Secure invitation & password-setup details" : "Create an authenticated faculty account with assigned classes & sections."}
    >
      {createdResult ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="block text-emerald-950 font-bold text-sm">Teacher Account Created in Supabase & Database</strong>
              <span>
                Account for <strong>{createdResult.full_name}</strong> has been provisioned with the <strong>Teacher</strong> role.
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-bold text-slate-500">Teacher ID:</span>
              <span className="font-mono font-bold text-slate-900">{createdResult.teacher_id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-bold text-slate-500">Email:</span>
              <span className="font-semibold text-slate-900">{createdResult.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-bold text-slate-500">Assigned Classes:</span>
              <span className="font-bold text-indigo-700">{createdResult.assigned_classes?.join(', ')}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Secure Invitation & Password-Setup Link
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={createdResult.invitation_link}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={copyInvitationLink}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1 shrink-0 transition-colors shadow-xs"
              >
                {copiedLink ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Send this invitation link to the teacher. Once they set their password, they can immediately log in through the <strong>common login page</strong> and will only see their assigned classes and authorized student records.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs"
            >
              Done & Return to Dashboard
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Robert Langdon"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="r.langdon@oakridge.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Teacher ID & Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Teacher ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. TCH-1045"
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Teaching Subject <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Physics"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Assigned Classes and Sections */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Assigned Classes & Sections <span className="text-rose-500">*</span></span>
              <span className="text-[11px] text-slate-500 font-normal">Select all authorized classrooms</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              {AVAILABLE_CLASSES.map((cls) => {
                const isSelected = formData.assignedClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleClassSelection(cls)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <School className="w-3.5 h-3.5" />
                    <span>{cls}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Initial Password */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Initial Password <span className="text-slate-400 font-normal">(Optional — left blank generates invitation setup link)</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Leave blank to send email invitation link"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Teacher Account...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Teacher Invitation</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
