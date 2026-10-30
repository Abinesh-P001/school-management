import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Mail,
  User,
  Hash,
  School,
  Phone,
  Lock,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { isUserTeacher } from '../../utils/permissions';

const AVAILABLE_GRADES = [
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12'
];

export default function AddStudentModal({ isOpen, onClose, studentToEdit = null }) {
  const {
    authToken,
    currentUser,
    classes,
    teacherAssignments,
    addStudent,
    updateStudent,
    showToast
  } = useApp();

  const isTeacher = isUserTeacher(currentUser);
  const authorizedClasses = teacherAssignments?.authorized_classes || [];
  const mentoredClass = teacherAssignments?.mentorship_class;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    studentId: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
    admissionNumber: `ADM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    classId: '',
    className: 'Grade 10',
    section: 'A',
    guardianName: '',
    guardianPhone: '',
    gender: 'Female',
    password: ''
  });

  // Preselect class for teacher or defaults or populate for editing
  useEffect(() => {
    if (studentToEdit) {
      setFormData({
        fullName: studentToEdit.name || '',
        email: studentToEdit.email || '',
        studentId: studentToEdit.studentId || studentToEdit.student_id || studentToEdit.id || '',
        admissionNumber: studentToEdit.admissionNumber || studentToEdit.admission_number || '',
        classId: studentToEdit.classId || studentToEdit.class_id || '',
        className: studentToEdit.grade || studentToEdit.class_name || 'Grade 10',
        section: studentToEdit.section || 'A',
        guardianName: studentToEdit.guardianName || studentToEdit.guardian_name || '',
        guardianPhone: studentToEdit.guardianPhone || studentToEdit.guardian_phone || '',
        gender: studentToEdit.gender || 'Female',
        password: '',
        feesStatus: studentToEdit.feesStatus || studentToEdit.fees_status || 'Pending',
        status: studentToEdit.status || 'Active'
      });
      return;
    }

    if (isTeacher) {
      if (mentoredClass) {
        setFormData(prev => ({
          ...prev,
          classId: mentoredClass.class_id,
          className: mentoredClass.name,
          section: mentoredClass.section
        }));
      } else if (authorizedClasses.length > 0) {
        const firstAuth = authorizedClasses[0];
        setFormData(prev => ({
          ...prev,
          classId: firstAuth.class_id,
          className: firstAuth.class_name,
          section: firstAuth.section
        }));
      }
    } else if (classes.length > 0) {
      const firstCls = classes[0];
      setFormData(prev => ({
        ...prev,
        classId: firstCls.id,
        className: firstCls.name,
        section: firstCls.section
      }));
    }
  }, [studentToEdit, isTeacher, mentoredClass, authorizedClasses.length, classes.length]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdResult, setCreatedResult] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleResetAndClose = () => {
    setFormData({
      fullName: '',
      email: '',
      studentId: `STU-${Math.floor(1000 + Math.random() * 9000)}`,
      admissionNumber: `ADM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      classId: '',
      className: 'Grade 10',
      section: 'A',
      guardianName: '',
      guardianPhone: '',
      gender: 'Female',
      password: ''
    });
    setErrorMessage('');
    setCreatedResult(null);
    setCopiedLink(false);
    onClose();
  };

  const handleClassSelectionChange = (classId) => {
    if (isTeacher) {
      const match = authorizedClasses.find(c => String(c.class_id) === String(classId));
      if (match) {
        setFormData({
          ...formData,
          classId: match.class_id,
          className: match.class_name,
          section: match.section
        });
      }
    } else {
      const match = classes.find(c => String(c.id) === String(classId));
      if (match) {
        setFormData({
          ...formData,
          classId: match.id,
          className: match.name,
          section: match.section
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (isTeacher && authorizedClasses.length === 0) {
      setErrorMessage('You are not authorized to register students for any classes. Please contact the administrator.');
      return;
    }

    if (
      !formData.fullName.trim() ||
      !formData.admissionNumber.trim() ||
      !formData.guardianName.trim() ||
      !formData.guardianPhone.trim()
    ) {
      setErrorMessage('Please fill in all required fields marked with *.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.fullName.trim(),
        full_name: formData.fullName.trim(),
        admission_number: formData.admissionNumber.trim(),
        student_id: formData.studentId.trim(),
        email: formData.email.trim() ? formData.email.trim().toLowerCase() : undefined,
        class_id: formData.classId || undefined,
        grade: formData.className,
        className: formData.className,
        section: formData.section,
        guardian_name: formData.guardianName.trim(),
        guardian_phone: formData.guardianPhone.trim(),
        gender: formData.gender,
        password: formData.password || undefined
      };

      if (studentToEdit) {
        await updateStudent(studentToEdit.id, payload);
        handleResetAndClose();
        return;
      }

      const result = await addStudent(payload);
      setCreatedResult({
        id: result.id,
        full_name: result.name || payload.name,
        email: result.email || payload.email || 'Automated Student Account',
        student_id: result.studentId || result.student_id || payload.student_id,
        admission_number: result.admissionNumber || result.admission_number || payload.admission_number,
        invitation_link: result.invitation_link
      });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to enroll student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInvitationLink = () => {
    if (createdResult?.invitation_link) {
      navigator.clipboard.writeText(createdResult.invitation_link);
      setCopiedLink(true);
      showToast('Student invitation link copied to clipboard!', 'info');
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title={studentToEdit ? "Edit Student Dossier" : (createdResult ? "Student Invitation Ready" : "Add Student Account")}
      subtitle={studentToEdit ? "Modify personal, academic, or contact records for this student." : (createdResult ? "Secure student invitation & password-setup details" : "Create an authenticated student account with institutional admission details.")}
    >
      {createdResult ? (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="block text-emerald-950 font-bold text-sm">Student Account Created in Supabase & Database</strong>
              <span>
                Account for <strong>{createdResult.full_name}</strong> has been provisioned with the <strong>Student</strong> role.
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-bold text-slate-500">Student ID:</span>
              <span className="font-mono font-bold text-slate-900">{createdResult.student_id}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-bold text-slate-500">Admission No:</span>
              <span className="font-mono font-bold text-blue-700">{createdResult.admission_number}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-bold text-slate-500">Email:</span>
              <span className="font-semibold text-slate-900">{createdResult.email}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-bold text-slate-500">Class & Section:</span>
              <span className="font-bold text-slate-800">{formData.className} — Section {formData.section}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="font-bold text-slate-500">Parent / Guardian:</span>
              <span className="font-medium text-slate-800">{formData.guardianName} ({formData.guardianPhone})</span>
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
              Send this invitation link to the student or guardian. After setting their password, they can log in via the <strong>common login page</strong> and will only have access to their own permitted academic records.
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
                Student Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Lucas Henderson"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Email Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="e.g. student@oakridge.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Admission Number & Student ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Admission Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. ADM-2026-104"
                  value={formData.admissionNumber}
                  onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Student ID <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. STU-1045"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Class & Section Selection */}
          {isTeacher ? (
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Authorized Class & Section <span className="text-rose-500">*</span>
              </label>
              {authorizedClasses.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-semibold flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>You are not authorized to register students for any classes. Only assigned mentors and authorized subject teachers can register students.</span>
                </div>
              ) : (
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={formData.classId}
                    onChange={(e) => handleClassSelectionChange(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    {authorizedClasses.map((ac) => (
                      <option key={ac.class_id} value={ac.class_id}>
                        {ac.display || `${ac.class_name} - Section ${ac.section}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Assigned Class & Section <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <School className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={formData.classId}
                  onChange={(e) => handleClassSelectionChange(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} - Section {cls.section} (Room: {cls.room || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Parent or Guardian Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Parent / Guardian Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Henderson"
                  value={formData.guardianName}
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Guardian Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={formData.guardianPhone}
                  onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Optional Password */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Initial Password <span className="text-slate-400 font-normal">(Optional — left blank generates invitation setup link)</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Leave blank to generate secure password-setup invitation"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Actions */}
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
                  <span>{studentToEdit ? "Updating Student..." : "Creating Student Account..."}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{studentToEdit ? "Save Changes" : "Send Student Invitation"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
