import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  GraduationCap,
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Mail,
  User,
  Phone,
  BookOpen,
  Calendar,
  Trash2,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getManagedUsers,
  createManagedUser,
  updateManagedUserStatus,
  deleteManagedUser
} from '../services/adminService';
import Modal from '../components/common/Modal';

export default function UserManagementPage() {
  const { currentUser, authToken, showToast } = useApp();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New user form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('student');
  const [initialPassword, setInitialPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // School-specific attributes
  const [department, setDepartment] = useState('Science');
  const [subject, setSubject] = useState('');
  const [qualification, setQualification] = useState("Bachelor's Degree");
  const [grade, setGrade] = useState('Grade 10');
  const [section, setSection] = useState('A');
  const [rollNumber, setRollNumber] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch users from backend
  const fetchUsers = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await getManagedUsers(authToken);
      setUsers(data);
    } catch (err) {
      console.warn('[UserManagement] Fetch notice:', err.message);
      // Fallback display if database is just initialized
      if (users.length === 0) {
        setUsers([
          {
            id: currentUser?.id || 1,
            email: currentUser?.email || 'admin@oakridge.edu',
            full_name: currentUser?.name || 'Administrator',
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString()
          }
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authToken, currentUser, users.length]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Generate strong random password
  const generateStrongPassword = () => {
    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInitialPassword(pwd);
    setConfirmPassword(pwd);
    setShowPassword(true);
  };

  // Handle form submission
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim() || !email.trim() || !initialPassword) {
      setFormError('Please fill in all required fields.');
      return;
    }

    if (initialPassword.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (initialPassword !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password: initialPassword,
        full_name: fullName.trim(),
        role: role.toLowerCase(),
        department: role === 'teacher' ? department : undefined,
        subject: role === 'teacher' ? subject : undefined,
        qualification: role === 'teacher' ? qualification : undefined,
        grade: role === 'student' ? grade : undefined,
        section: role === 'student' ? section : undefined,
        roll_number: role === 'student' ? rollNumber : undefined,
        guardian_name: role === 'student' ? guardianName : undefined,
        guardian_phone: role === 'student' ? guardianPhone : undefined,
        phone: phone || undefined
      };

      const created = await createManagedUser(payload, authToken);
      showToast(`User account created for ${created.full_name} (${created.role})!`, 'success');

      // Reset form
      setFullName('');
      setEmail('');
      setInitialPassword('');
      setConfirmPassword('');
      setSubject('');
      setRollNumber('');
      setGuardianName('');
      setGuardianPhone('');
      setPhone('');
      setCreateModalOpen(false);

      // Refresh list
      fetchUsers();
    } catch (err) {
      setFormError(err.message || 'Failed to create user account.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle user active status
  const handleToggleStatus = async (user) => {
    if (user.id === currentUser?.id) {
      showToast('You cannot deactivate your own administrative account.', 'error');
      return;
    }

    try {
      const updated = await updateManagedUserStatus(user.id, !user.is_active, authToken);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: updated.is_active } : u));
      showToast(`User status updated to ${updated.is_active ? 'Active' : 'Inactive'}`, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to update user status.', 'error');
    }
  };

  // Delete user
  const handleDeleteUser = async (user) => {
    if (user.id === currentUser?.id) {
      showToast('You cannot delete your own administrative account.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete user account ${user.email}?`)) {
      return;
    }

    try {
      await deleteManagedUser(user.id, authToken);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      showToast(`User ${user.email} removed successfully.`, 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete user.', 'error');
    }
  };

  // Metrics
  const totalCount = users.length;
  const adminCount = users.filter(u => (u.role || '').toLowerCase() === 'admin').length;
  const teacherCount = users.filter(u => (u.role || '').toLowerCase() === 'teacher').length;
  const studentCount = users.filter(u => (u.role || '').toLowerCase() === 'student').length;

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));

      const matchesRole =
        roleFilter === 'ALL' ||
        (u.role && u.role.toLowerCase() === roleFilter.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.is_active) ||
        (statusFilter === 'INACTIVE' && !u.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-3xl border border-slate-300 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-950 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Administrative Access Governance</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              User & Role Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Securely provision, configure, and administer login accounts for Administrators, Teachers, and Students.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
              title="Refresh users list"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Create New User</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Governance Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-blue-950">
        <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold text-blue-900">Enterprise Security Rules: </strong>
          All accounts created here enter through the single, common login portal. Passwords are encrypted on submission with industry-standard bcrypt hashes. Passwords and internal secrets are strictly never displayed or returned in API responses.
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-300 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Users</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{totalCount}</p>
          <span className="text-[11px] font-semibold text-slate-500">Active institutional accounts</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-300 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Admins</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{adminCount}</p>
          <span className="text-[11px] font-semibold text-purple-700">Full administrative role</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-300 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Faculty</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{teacherCount}</p>
          <span className="text-[11px] font-semibold text-indigo-700">Teacher portal access</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-300 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">Students</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{studentCount}</p>
          <span className="text-[11px] font-semibold text-emerald-700">Student portal access</span>
        </div>
      </div>

      {/* Directory & Filters */}
      <div className="bg-white rounded-3xl border border-slate-300 shadow-xs overflow-hidden">
        {/* Filters Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by full name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
              {['ALL', 'admin', 'teacher', 'student'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                    roleFilter.toLowerCase() === r.toLowerCase()
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r === 'ALL' ? 'All Roles' : r}
                </button>
              ))}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 sm:px-6">User / Identity</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                      <span>Loading user accounts from secure directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No user accounts match your search filters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleLower = (u.role || 'student').toLowerCase();
                  const isCurrentAdmin = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold shrink-0">
                            {u.full_name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                              <span>{u.full_name}</span>
                              {isCurrentAdmin && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full border border-blue-200">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            roleLower === 'admin'
                              ? 'bg-purple-100 text-purple-900 border-purple-200'
                              : roleLower === 'teacher'
                              ? 'bg-indigo-100 text-indigo-900 border-indigo-200'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                          }`}
                        >
                          {roleLower === 'admin' && <ShieldCheck className="w-3 h-3 mr-1" />}
                          {roleLower === 'teacher' && <Briefcase className="w-3 h-3 mr-1" />}
                          {roleLower === 'student' && <GraduationCap className="w-3 h-3 mr-1" />}
                          {roleLower.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              u.is_active ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrentAdmin}
                            title={isCurrentAdmin ? 'Cannot deactivate self' : u.is_active ? 'Deactivate account' : 'Activate account'}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                              isCurrentAdmin
                                ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                                : u.is_active
                                ? 'border-amber-300 text-amber-800 hover:bg-amber-50'
                                : 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                            }`}
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrentAdmin}
                            title={isCurrentAdmin ? 'Cannot delete self' : 'Permanently delete user'}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isCurrentAdmin
                                ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400'
                                : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create User Account */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Institutional Account"
        subtitle="Provision an authenticated user account with strict role assignments."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Select Assigned Role <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'admin', label: 'Admin', desc: 'Full permissions', icon: ShieldCheck },
                { id: 'teacher', label: 'Teacher', desc: 'Faculty portal', icon: Briefcase },
                { id: 'student', label: 'Student', desc: 'Student access', icon: GraduationCap }
              ].map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20'
                        : 'border-slate-300 hover:border-slate-400 bg-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                    <p className="text-xs font-bold text-slate-900">{r.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{r.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Arthur Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="e.g. a.vance@oakridge.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Role-Specific School Details */}
          {role === 'teacher' && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center space-x-1">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Faculty & Department Allocations</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Languages">Languages</option>
                    <option value="Humanities">Humanities</option>
                    <option value="Arts & Music">Arts & Music</option>
                    <option value="Physical Education">Physical Education</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Primary Subject</label>
                  <input
                    type="text"
                    placeholder="e.g. AP Chemistry"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Qualification</label>
                  <input
                    type="text"
                    placeholder="e.g. M.Sc, B.Ed."
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {role === 'student' && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center space-x-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student Academic Enrollment</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Grade</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Section</label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="A">Section A</option>
                    <option value="B">Section B</option>
                    <option value="C">Section C</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Roll Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 10A-15"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Guardian Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Helen Drake"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Guardian Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 (555) 345-6789"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Secure Initial Password */}
          <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Initial Account Password <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={generateStrongPassword}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Auto-Generate</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 8 characters"
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Never share or display passwords in public views. The user can immediately sign in with this password.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Provisioning Account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
