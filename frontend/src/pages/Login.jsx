import React, { useState } from 'react';

export default function Login({ onLoginSuccess, showToast }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('worker');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin 
      ? { email: cleanEmail, password: cleanPassword } 
      : { name: name.trim(), email: cleanEmail, password: cleanPassword, role };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        if (isLogin) {
          onLoginSuccess(data.user);
        } else {
          showToast('Registration successful! You can now log in.', 'success');
          setIsLogin(true);
          setName('');
          setPassword('');
        }
      } else {
        showToast(data.message || 'Something went wrong.', 'error');
      }
    } catch (error) {
      console.error('Auth error:', error);
      showToast('Connection to backend failed. Make sure Flask server is running on port 5000.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loginWithCredentials = async (cleanEmail, cleanPassword) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      });
      const data = await response.json();
      if (data.success) {
        onLoginSuccess(data.user);
      } else {
        showToast(data.message || 'Invalid email or password.', 'error');
      }
    } catch {
      showToast('Connection to backend failed. Make sure Flask server is running on port 5000.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAutofill = (userRole) => {
    const credentials = userRole === 'manager'
      ? { email: 'manager@hospital.com', password: 'manager123' }
      : { email: 'worker@hospital.com', password: 'worker123' };
    setEmail(credentials.email);
    setPassword(credentials.password);
    setRole(userRole);
    setIsLogin(true);
    loginWithCredentials(credentials.email, credentials.password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden px-4">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl shadow-2xl border border-slate-800 animate-slide-up relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-teal-500/10 rounded-xl mb-4 border border-teal-500/30">
            {/* Heartbeat/ECG SVG Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-300 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            HospitAI Verifier
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Hospital Audit Image Proof Verification System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                placeholder="Dr. Sarah Miller"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              placeholder="worker@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Account Role</label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setRole('worker')}
                  className={`py-3 rounded-xl border text-sm font-medium transition ${
                    role === 'worker'
                      ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Hospital Worker
                </button>
                <button
                  type="button"
                  onClick={() => setRole('manager')}
                  className={`py-3 rounded-xl border text-sm font-medium transition ${
                    role === 'manager'
                      ? 'border-teal-500 bg-teal-500/10 text-teal-400'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  Audit Manager
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-teal-500/20 active:scale-[0.98] transition duration-150 disabled:opacity-50 mt-2 flex items-center justify-center"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 mr-3 text-slate-950" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Quick Autofill Buttons for Testing */}
        <div className="mt-6 pt-6 border-t border-slate-900/60">
          <p className="text-center text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-3">Quick Access (Pre-seeded Accounts)</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleAutofill('manager')}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-teal-400 flex flex-col items-center justify-center transition disabled:opacity-50"
            >
              <span>Audit Manager</span>
              <span className="text-[9px] text-slate-500 font-normal">manager@hospital.com</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleAutofill('worker')}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-cyan-400 flex flex-col items-center justify-center transition disabled:opacity-50"
            >
              <span>Hospital Worker</span>
              <span className="text-[9px] text-slate-500 font-normal">worker@hospital.com</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-teal-400 hover:text-teal-300 text-sm font-medium transition"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
