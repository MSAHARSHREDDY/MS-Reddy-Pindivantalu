import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, authNotice, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>(authModalMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');

  React.useEffect(() => {
    setMode(authModalMode);
    if (authModalMode === 'register') {
      setPhone('+91 ');
    } else {
      setPhone('');
    }
    setError('');
    setMessage('');
    setGeneratedPassword('');
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setGeneratedPassword('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await register(name, email, phone, password);
      } else if (mode === 'forgot') {
        const res = await api.forgotPassword(email);
        if (res.success) {
          if (res.tempPassword) {
            setGeneratedPassword(res.tempPassword);
            setMessage('A new random temporary password has been generated for your account:');
          } else {
            setMessage(res.message || 'Password reset requested.');
          }
        }
      } else if (mode === 'reset') {
        const res = await api.resetPassword({ email, code: resetCode, newPassword });
        if (res.success) {
          setMessage(res.message || 'Password reset successfully.');
          setTimeout(() => setMode('login'), 1500);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={closeAuthModal}
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
      />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-stone-200 z-10 p-6 sm:p-8">
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <span className="font-display text-2xl font-bold text-[#451A03]">
            Sahadeep Reddy's
          </span>
          <h3 className="text-base font-semibold text-stone-900 mt-1">
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Create Your Account'}
            {mode === 'forgot' && 'Reset Your Password'}
            {mode === 'reset' && 'Set New Password'}
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            {mode === 'login' && 'Log in to view saved addresses and track orders.'}
            {mode === 'register' && 'Join for fresh homemade Telugu snacks delivered to your door.'}
            {mode === 'forgot' && 'Enter your registered email to generate a new random password.'}
            {mode === 'reset' && 'Enter the reset code and choose a new password.'}
          </p>
        </div>

        {authNotice && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium rounded-lg flex items-center gap-2">
            <span>🔒</span>
            <span>{authNotice}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
            {message}
          </div>
        )}

        {generatedPassword && (
          <div className="mb-4 p-3 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-900">Your New Password:</span>
              <span className="font-mono text-sm font-bold bg-white px-2.5 py-1 rounded border border-amber-200 text-stone-900 select-all">
                {generatedPassword}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPassword(generatedPassword);
                setMode('login');
              }}
              className="w-full py-1.5 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] rounded-lg font-semibold text-[11px] transition-colors"
            >
              Sign In With This Password
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Rao"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Phone Number (for order delivery)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone || '+91 '}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (!val.startsWith('+91')) {
                      val = '+91 ' + val.replace(/^\+91\s*/, '');
                    }
                    setPhone(val);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-amber-800 hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Reset Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Enter code"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg uppercase tracking-wider font-mono focus:outline-none focus:border-amber-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="New password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:border-amber-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 transition-colors"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 mt-2 bg-[#451A03] hover:bg-[#78350F] text-[#FEF3C7] rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>
              {mode === 'login' && 'Sign In'}
              {mode === 'register' && 'Create Account'}
              {mode === 'forgot' && 'Generate New Password'}
              {mode === 'reset' && 'Reset Password'}
            </span>
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-4 text-center text-xs text-stone-600">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="font-semibold text-[#78350F] hover:underline"
              >
                Register now
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="font-semibold text-[#78350F] hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
