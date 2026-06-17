import React, { useState, useEffect } from 'react';

export default function AlertsPanel({ showToast, onNavigate }) {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unresolved'); // 'unresolved', 'resolved', 'all'
  const [levelFilter, setLevelFilter] = useState('all'); // 'all', 'warning', 'supervisor'

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      if (data.success) {
        setAlerts(data.alerts);
        setFilteredAlerts(data.alerts.filter(a => a.status === 'unresolved'));
      }
    } catch (e) {
      showToast("Error fetching alerts list.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Apply filters
  useEffect(() => {
    let result = alerts;
    
    // Status filter
    if (filter !== 'all') {
      result = result.filter(a => a.status === filter);
    }

    // Level filter
    if (levelFilter !== 'all') {
      result = result.filter(a => a.alert_level === levelFilter);
    }

    setFilteredAlerts(result);
  }, [filter, levelFilter, alerts]);

  const handleResolve = async (alertId) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        showToast("Alert resolved.", "success");
        fetchAlerts();
      } else {
        showToast(data.message || "Failed to resolve alert.", "error");
      }
    } catch (e) {
      showToast("Server communication error.", "error");
    }
  };

  const handleInspectAudit = async (resultId) => {
    if (!resultId) {
      showToast("Verification reference not found for this alert.", "error");
      return;
    }
    showToast("Fetching audit details...", "info");
    try {
      const res = await fetch('/api/audit-history');
      const data = await res.json();
      if (data.success) {
        const matched = data.records.find(r => r._id === resultId);
        if (matched) {
          onNavigate('verification-result', { verificationResult: matched });
        } else {
          showToast("Verification details record no longer exists in database.", "error");
        }
      }
    } catch (e) {
      showToast("Error opening audit link.", "error");
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
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Compliance Triggered Alerts</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review checklist deviations. Warnings are triggered below 70% similarity, while Critical Supervisor Alerts are sent below 50%.
        </p>
      </div>

      {/* Filter Options */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap gap-4 items-center justify-between shadow-lg">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('unresolved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'unresolved' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 border border-slate-850 hover:text-slate-350'
            }`}
          >
            Active Unresolved ({alerts.filter(a => a.status === 'unresolved').length})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'resolved' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 border border-slate-850 hover:text-slate-350'
            }`}
          >
            Resolved ({alerts.filter(a => a.status === 'resolved').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'all' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400 border border-slate-850 hover:text-slate-350'
            }`}
          >
            All Alerts ({alerts.length})
          </button>
        </div>

        <div>
          <select
            className="px-3.5 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-slate-355 text-xs font-semibold focus:outline-none focus:border-teal-500 transition"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="all">All Severity Levels</option>
            <option value="warning">Warnings only (&lt; 70%)</option>
            <option value="supervisor">Supervisor Alerts only (&lt; 50%)</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="glass-panel p-10 text-center text-slate-500 border border-slate-800 rounded-2xl">
            No compliance alerts matching filters. All systems are green.
          </div>
        ) : (
          filteredAlerts.map((alert, idx) => {
            const isUnresolved = alert.status === 'unresolved';
            const isSupervisor = alert.alert_level === 'supervisor';
            
            return (
              <div 
                key={idx} 
                className={`glass-panel p-5 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-xl transition hover:border-slate-800 ${
                  isUnresolved 
                    ? isSupervisor 
                      ? 'border-rose-900/40 bg-rose-950/5' 
                      : 'border-amber-900/40 bg-amber-950/5'
                    : 'border-slate-900 bg-slate-950/20'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center flex-wrap gap-2.5">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                      isSupervisor 
                        ? 'bg-rose-500/10 text-rose-450 border-rose-500/20' 
                        : 'bg-amber-500/10 text-amber-450 border-amber-500/20'
                    }`}>
                      {isSupervisor ? '🚨 Supervisor Alert' : '⚠ Compliance Warning'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Triggered {new Date(alert.timestamp).toLocaleString()}
                    </span>
                    {!isUnresolved && (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[9px] font-bold uppercase">
                        RESOLVED
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-200 font-semibold">{alert.message}</p>
                  
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-450 pt-1 border-t border-slate-900/50">
                    <div>
                      <span className="text-slate-500 uppercase font-bold text-[9px] mr-1">Checklist:</span> 
                      <span className="text-slate-300 font-medium">{alert.checklist_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-bold text-[9px] mr-1">Location:</span> 
                      <span className="text-slate-300 font-medium">{alert.department} • {alert.ward} • Floor {alert.floor}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase font-bold text-[9px] mr-1">Similarity:</span> 
                      <span className="text-teal-400 font-bold font-mono">{(alert.similarity_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0 md:self-center">
                  <button
                    onClick={() => handleInspectAudit(alert.verification_result_id)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-semibold transition"
                  >
                    Inspect Audit
                  </button>
                  {isUnresolved && (
                    <button
                      onClick={() => handleResolve(alert._id)}
                      className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-450 border border-emerald-500/20 rounded-lg text-xs font-bold transition duration-150"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
