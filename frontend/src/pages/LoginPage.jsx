import { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  Database,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const { handleLogin, handleSetupPassword, schoolInfo } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password Setup Mode (from email/invitation link)
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [setupEmail, setSetupEmail] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupSuccess, setSetupSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('setup_token');
      const emailParam = params.get('email');
      const invited = params.get('invited');

      if (token || invited) {
        setIsSetupMode(true);
        if (emailParam) setSetupEmail(emailParam);
        if (token) setSetupToken(token);
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your institutional email and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await handleLogin(email.trim(), password);
      const isSuccess = result === true || result?.success === true;
      if (!isSuccess) {
        setErrorMessage(result?.error || 'Authentication failed. Please verify your email and password.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!setupEmail.trim()) {
      setErrorMessage('Please enter your institutional email address.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters in length.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      await handleSetupPassword(setupEmail.trim(), newPassword);
      setSetupSuccess(true);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to configure account password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center py-6 sm:py-12 px-3 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Decorative background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-3xl pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-indigo-600/10 blur-3xl pointer-events-none rounded-full" />

      {/* Institutional Security Status Banner */}
      <div className="max-w-md w-full mx-auto px-2 sm:px-4 mb-3 sm:mb-4">
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-2.5 sm:p-3 text-[11px] sm:text-xs text-emerald-950 font-bold flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center space-x-2 min-w-0">
            <Database className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="font-bold text-emerald-950 truncate">Institutional Security Active</span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900 border border-emerald-400 shrink-0">
            Row Level Security (RLS)
          </span>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-2 sm:px-4">
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-600 shadow-lg text-2xl sm:text-3xl mb-2 sm:mb-3 text-white">
            🎓
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {schoolInfo.name}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
            Institutional Management & Academic Portal
          </p>
        </div>

        {/* Card: Either Password Setup or Normal Sign In */}
        <div className="mt-5 sm:mt-6 bg-white rounded-3xl shadow-xl p-5 sm:p-8 border border-slate-300">
          {isSetupMode ? (
            <div>
              <div className="mb-6 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Set Up Your Account Password</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Complete your institutional invitation setup to access your portal.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center space-x-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSetupSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Institutional Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={setupEmail}
                      onChange={(e) => setSetupEmail(e.target.value)}
                      placeholder="name@oakridge.edu"
                      className="w-full pl-10 pr-3 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-70 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Configuring Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Set Password & Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSetupMode(false)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                  >
                    Already set your password? Return to standard sign in
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              <div className="mb-6 text-center">
                <h2 className="text-lg font-bold text-slate-900">Sign In to Your Account</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Universal login for Administrators, Faculty, Students, and Parents
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800 flex items-center space-x-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email / Username Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Institutional Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      autoFocus
                      autoComplete="username"
                      placeholder="admin@oakridge.edu or admin"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      placeholder="Enter account password (or admin)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-xs font-medium border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-70 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Fill Credentials Helper */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
                  Quick Select Role Credentials
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('admin@oakridge.edu');
                      setPassword('AdminPassword123!');
                    }}
                    className="p-2 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all group"
                  >
                    <span className="block font-black text-xs text-slate-900 group-hover:text-blue-700">👑 Administrator</span>
                    <span className="block text-[10px] text-slate-400 font-mono truncate">admin@oakridge.edu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail('e.vance@oakridge.edu');
                      setPassword('TeacherSecure123!');
                    }}
                    className="p-2 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all group"
                  >
                    <span className="block font-black text-xs text-slate-900 group-hover:text-blue-700">👨‍🏫 Faculty Teacher</span>
                    <span className="block text-[10px] text-slate-400 font-mono truncate">e.vance@oakridge.edu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail('nausheen.stu7493@oakridge.edu');
                      setPassword('StudentSecure123!');
                    }}
                    className="p-2 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all group"
                  >
                    <span className="block font-black text-xs text-slate-900 group-hover:text-blue-700">🎓 Student Nausheen (ID 18)</span>
                    <span className="block text-[10px] text-slate-400 font-mono truncate">nausheen.stu7493@oakridge.edu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail('maya.lin@oakridge.edu');
                      setPassword('StudentSecure123!');
                    }}
                    className="p-2 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all group"
                  >
                    <span className="block font-black text-xs text-slate-900 group-hover:text-blue-700">🎓 Student Maya (ID 2)</span>
                    <span className="block text-[10px] text-slate-400 font-mono truncate">maya.lin@oakridge.edu</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEmail('parent.chen@oakridge.edu');
                      setPassword('ParentSecure123!');
                    }}
                    className="p-2 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all group"
                  >
                    <span className="block font-black text-xs text-slate-900 group-hover:text-blue-700">👨‍👩‍👧 Parent Portal</span>
                    <span className="block text-[10px] text-slate-400 font-mono truncate">parent.chen@oakridge.edu</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Secure Access Notice */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Protected by role-based access control. Upon sign-in, you will be automatically routed to your role dashboard.
            </p>
            <div className="mt-2 inline-flex items-center space-x-1 text-[10px] text-slate-400 font-semibold">
              <ShieldCheck className="w-3 h-3 text-slate-400" />
              <span>Accounts are provisioned by the School Administrator.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500 font-medium">
          &copy; 2026 {schoolInfo.name}. Secured with Supabase PostgreSQL & FastAPI RBAC.
        </p>
      </div>
    </div>
  );
}
