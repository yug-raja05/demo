import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ChecklistManagement from './pages/ChecklistManagement';
import UploadProof from './pages/UploadProof';
import VerificationResult from './pages/VerificationResult';
import AuditHistory from './pages/AuditHistory';
import AlertsPanel from './pages/AlertsPanel';
import ResolutionPredictionDashboard from './pages/ResolutionPredictionDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [selectedChecklist, setSelectedChecklist] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  
  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });

  // Load session from localStorage if present
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    setCurrentTab('dashboard');
    showToast(`Welcome back, ${userData.name}!`, 'success');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    showToast('Logged out successfully.', 'info');
  };

  const handleNavigate = (tab, params = {}) => {
    setCurrentTab(tab);
    if (params.selectedChecklist !== undefined) {
      setSelectedChecklist(params.selectedChecklist);
    }
    if (params.verificationResult !== undefined) {
      setVerificationResult(params.verificationResult);
    }
  };

  const handleVerificationComplete = (resultData) => {
    setVerificationResult(resultData);
    setCurrentTab('verification-result');
  };

  if (!user) {
    return (
      <>
        <Login onLoginSuccess={handleLoginSuccess} showToast={showToast} />
        {toast.visible && <Toast toast={toast} />}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 glass-panel border-b md:border-b-0 md:border-r border-slate-900 flex flex-col shrink-0">
        
        {/* Logo and Brand */}
        <div className="p-6 border-b border-slate-900 flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400 border border-teal-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight bg-gradient-to-r from-teal-300 to-cyan-400 bg-clip-text text-transparent">
              HospitAI Verifier
            </h2>
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">CV + ML Verification</span>
          </div>
        </div>

        {/* User profile capsule */}
        <div className="p-4 mx-4 my-3 bg-slate-900/40 border border-slate-900 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-teal-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold font-sans">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-200 truncate">{user.name}</div>
            <div className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider truncate mt-0.5">{user.role}</div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-3 space-y-1.5 overflow-y-auto">
          {/* Dashboard (All roles) */}
          <button
            onClick={() => handleNavigate('dashboard')}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition ${
              currentTab === 'dashboard'
                ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
            </svg>
            Dashboard
          </button>

          {/* Manager Tabs */}
          {user.role === 'manager' && (
            <>
              <button
                onClick={() => handleNavigate('checklist-management')}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  currentTab === 'checklist-management'
                    ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Manage Checklists
              </button>

              <button
                onClick={() => handleNavigate('alerts-panel')}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  currentTab === 'alerts-panel'
                    ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Triggered Alerts
              </button>

              <button
                onClick={() => handleNavigate('resolution-prediction')}
                className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  currentTab === 'resolution-prediction'
                    ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Resolution AI
              </button>
            </>
          )}

          {/* Worker Tabs */}
          {user.role === 'worker' && (
            <button
              onClick={() => handleNavigate('upload-proof')}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition ${
                currentTab === 'upload-proof' || currentTab === 'verification-result'
                  ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Upload Proof
            </button>
          )}

          {/* Audit History (All roles) */}
          <button
            onClick={() => handleNavigate('audit-history')}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition ${
              currentTab === 'audit-history'
                ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Audit History
          </button>
        </nav>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-900/60 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center py-2.5 bg-slate-900 hover:bg-slate-900/80 hover:text-rose-400 border border-slate-850 rounded-xl text-sm font-semibold text-slate-400 transition"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {currentTab === 'dashboard' && (
          <Dashboard user={user} onNavigate={handleNavigate} showToast={showToast} />
        )}
        {currentTab === 'checklist-management' && user.role === 'manager' && (
          <ChecklistManagement showToast={showToast} />
        )}
        {currentTab === 'alerts-panel' && user.role === 'manager' && (
          <AlertsPanel showToast={showToast} onNavigate={handleNavigate} />
        )}
        {currentTab === 'upload-proof' && user.role === 'worker' && (
          <UploadProof 
            user={user} 
            selectedChecklist={selectedChecklist} 
            onVerificationComplete={handleVerificationComplete} 
            showToast={showToast} 
          />
        )}
        {currentTab === 'verification-result' && (
          <VerificationResult 
            result={verificationResult} 
            onReset={() => handleNavigate('upload-proof', { selectedChecklist: null })} 
            onViewHistory={() => handleNavigate('audit-history')} 
          />
        )}
        {currentTab === 'audit-history' && (
          <AuditHistory showToast={showToast} onNavigate={handleNavigate} />
        )}
        {currentTab === 'resolution-prediction' && user.role === 'manager' && (
          <ResolutionPredictionDashboard showToast={showToast} />
        )}
      </main>

      {/* Floating Toast Alert */}
      {toast.visible && <Toast toast={toast} />}
    </div>
  );
}

// Toast Helper Component
function Toast({ toast }) {
  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';
  
  return (
    <div className="fixed bottom-5 right-5 z-50 animate-slide-up">
      <div className={`flex items-center gap-3 px-4.5 py-3.5 rounded-xl border shadow-2xl glass-panel ${
        isSuccess ? 'border-emerald-500/30' : isError ? 'border-rose-500/30' : 'border-teal-500/30'
      }`}>
        <div className={`p-1.5 rounded-lg border ${
          isSuccess 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : isError 
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
              : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
        }`}>
          {isSuccess ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            </svg>
          ) : isError ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <div className="text-xs font-semibold text-slate-200 pr-2">{toast.message}</div>
      </div>
    </div>
  );
}
