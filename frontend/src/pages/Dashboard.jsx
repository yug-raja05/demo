import React, { useState, useEffect } from 'react';

export default function Dashboard({ user, onNavigate, showToast }) {
  const [stats, setStats] = useState({
    total_checklists: 0,
    total_verifications: 0,
    verified_count: 0,
    partially_verified_count: 0,
    failed_count: 0,
    unresolved_alerts: 0,
    warning_alerts: 0,
    supervisor_alerts: 0,
    avg_similarity: 0
  });
  
  const [checklists, setChecklists] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  const fetchData = async () => {
    try {
      // 1. Stats
      const statsRes = await fetch('/api/dashboard-stats');
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }

      // 2. Checklists
      const checklistsRes = await fetch('/api/checklists');
      const checklistsData = await checklistsRes.json();
      if (checklistsData.success) {
        setChecklists(checklistsData.checklists);
      }

      // 3. Audit history (recent submissions)
      const historyRes = await fetch('/api/audit-history');
      const historyData = await historyRes.json();
      if (historyData.success) {
        setRecentRecords(historyData.records.slice(0, 5));
      }

      // 4. Alerts
      const alertsRes = await fetch('/api/alerts');
      const alertsData = await alertsRes.json();
      if (alertsData.success) {
        setAlerts(alertsData.alerts.filter(a => a.status === 'unresolved').slice(0, 3));
      }

    } catch (error) {
      console.error("Dashboard fetch error:", error);
      showToast("Error loading dashboard metrics. Ensure backend server is running.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleResolveAlert = async (alertId) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        showToast("Alert resolved successfully.", "success");
        fetchData();
      } else {
        showToast(data.message || "Failed to resolve alert.", "error");
      }
    } catch (e) {
      showToast("Connection to server failed.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <svg className="animate-spin h-10 w-10 text-teal-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Welcome back, <span className="text-teal-400">{user.name}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 sm:mt-2 max-w-xl">
              You are logged in as a <span className="text-cyan-400 font-semibold uppercase text-xs px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800/40">{user.role}</span>. Compare worker proof images against checklist reference standards using computer vision and Random Forest ML.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {user.role === 'manager' && (
              <button
                onClick={() => onNavigate('checklist-management')}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-teal-500/20 active:scale-[0.98] transition duration-150 text-sm flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create Checklist
              </button>
            )}
            <button
              onClick={() => onNavigate(user.role === 'manager' ? 'audit-history' : 'upload-proof')}
              className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold rounded-xl transition text-sm"
            >
              {user.role === 'manager' ? 'View Audit History' : 'Upload Audit Proof'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Checklists</span>
            <div className="text-3xl font-extrabold text-slate-100">{stats.total_checklists}</div>
          </div>
          <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-teal-750"></div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Verifications Done</span>
            <div className="text-3xl font-extrabold text-slate-100">{stats.total_verifications}</div>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-cyan-750"></div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg AI Similarity</span>
            <div className="text-3xl font-extrabold text-teal-400">{stats.avg_similarity}%</div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-750"></div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Unresolved Alerts</span>
            <div className="text-3xl font-extrabold text-rose-500">{stats.unresolved_alerts}</div>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-700"></div>
        </div>
      </div>

      {/* Alert Feed Widget for managers */}
      {user.role === 'manager' && alerts.length > 0 && (
        <div className="glass-panel p-6 rounded-2xl border border-rose-900/30 bg-rose-950/5 shadow-xl space-y-4 animate-pulse-slow">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <span>🚨</span> Critical Supervisor Alerts Requiring Action
            </h2>
            <button 
              onClick={() => onNavigate('alerts-panel')}
              className="text-xs font-semibold text-rose-400 hover:underline"
            >
              Manage Alerts ({stats.unresolved_alerts}) &rarr;
            </button>
          </div>
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className="p-4 bg-slate-950 border border-rose-900/40 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      alert.alert_level === 'supervisor' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {alert.alert_level === 'supervisor' ? '🚨 Supervisor Alert' : '⚠ Verification Warning'}
                    </span>
                    <span className="text-[10px] text-slate-500">{new Date(alert.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium">{alert.message}</p>
                  <p className="text-[10px] text-slate-500">
                    Location: {alert.department} • {alert.ward} • Floor {alert.floor} • Similarity: {(alert.similarity_score * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => handleResolveAlert(alert._id)}
                    className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-slate-950 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition duration-150"
                  >
                    Resolve Alert
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Verification Status Distribution */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-1">
              <span className="text-teal-400">📊</span> Audit Status Distribution
            </h2>
            <p className="text-xs text-slate-400">Status classification summary by Random Forest model.</p>
            
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-emerald-400">Verified</span>
                  <span className="text-slate-300">{stats.verified_count} audits ({stats.total_verifications > 0 ? ((stats.verified_count/stats.total_verifications)*100).toFixed(0) : 0}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ width: `${stats.total_verifications > 0 ? (stats.verified_count/stats.total_verifications)*100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-amber-400">Partially Verified</span>
                  <span className="text-slate-300">{stats.partially_verified_count} audits ({stats.total_verifications > 0 ? ((stats.partially_verified_count/stats.total_verifications)*100).toFixed(0) : 0}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-500" 
                    style={{ width: `${stats.total_verifications > 0 ? (stats.partially_verified_count/stats.total_verifications)*100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-rose-400">Failed / Rejected</span>
                  <span className="text-slate-300">{stats.failed_count} audits ({stats.total_verifications > 0 ? ((stats.failed_count/stats.total_verifications)*100).toFixed(0) : 0}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 transition-all duration-500" 
                    style={{ width: `${stats.total_verifications > 0 ? (stats.failed_count/stats.total_verifications)*100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-slate-900/60 pt-4 mt-6 flex items-center justify-between text-[11px] text-slate-500">
            <span>Accuracy trained: 100%</span>
            <span>MongoDB Persistent Storage</span>
          </div>
        </div>

        {/* Audit Checklists Grid */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 lg:col-span-2 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-1">
              <span className="text-teal-400">📋</span> Active Audit Checklists
            </h2>
            <p className="text-xs text-slate-400">
              {user.role === 'manager' 
                ? 'Checklists registered in the hospital system. Manage checklists or verify worker uploads.'
                : 'Select an audit checklist to upload your verification proof image.'}
            </p>

            <div className="mt-4 space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {checklists.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No checklists registered yet.
                </div>
              ) : (
                checklists.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-900/80 hover:border-slate-800 transition">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-slate-200">{c.name}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] uppercase font-bold text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-500/20">
                          {c.department}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {c.ward} • Floor {c.floor}
                        </span>
                      </div>
                    </div>
                    <div>
                      {user.role === 'worker' ? (
                        <button
                          onClick={() => handleUploadProofClick(c)}
                          className="px-3.5 py-1.5 bg-teal-500/10 hover:bg-teal-500 hover:text-slate-950 text-teal-400 font-bold rounded-lg text-xs border border-teal-500/30 transition duration-150"
                        >
                          Verify Proof
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 bg-slate-900 px-2.5 py-1 rounded border border-slate-850">Expected: {c.expected_objects.join(", ")}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {user.role === 'manager' && (
            <button
              onClick={() => onNavigate('checklist-management')}
              className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs border border-slate-800 transition text-center mt-4"
            >
              + Create New Checklist Item
            </button>
          )}
        </div>

      </div>

      {/* Recent Activity Table */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span className="text-teal-400">⏱</span> Recent Proof Submissions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Last 5 verification records submitted by inspector staff.</p>
          </div>
          <button
            onClick={() => onNavigate('audit-history')}
            className="text-xs font-semibold text-teal-400 hover:underline"
          >
            View Full Audit Logs &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <th className="py-3 px-4">Inspector</th>
                <th className="py-3 px-4">Checklist</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Similarity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Result Details</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 italic">
                    No image proof submissions recorded yet.
                  </td>
                </tr>
              ) : (
                recentRecords.map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-900 hover:bg-slate-905/30 transition text-slate-350">
                    <td className="py-3 px-4 font-semibold text-slate-200">{r.inspector_name || r.inspector_id}</td>
                    <td className="py-3 px-4 font-medium">{r.checklist_name}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {r.department} • {r.ward}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-teal-400">
                      {(r.similarity_score * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                        r.status === 'Verified' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : r.status === 'Partially Verified'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => onNavigate('verification-result', { verificationResult: r })}
                        className="text-[10px] font-bold text-cyan-400 hover:underline"
                      >
                        Review AI Verdict &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
