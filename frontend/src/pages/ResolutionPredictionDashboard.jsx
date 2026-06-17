import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
  },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(30,41,59,0.5)' } },
    y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(30,41,59,0.5)' } },
  },
};

function StatCard({ label, value, sub, color = 'teal' }) {
  const colors = {
    teal: 'from-teal-500/20 to-cyan-500/10 border-teal-500/30 text-teal-400',
    rose: 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-400',
    emerald: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-400',
    amber: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
  };
  return (
    <div className={`glass-panel rounded-2xl border p-5 bg-gradient-to-br ${colors[color]}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</div>
      <div className="text-3xl font-extrabold text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function PredictionBadge({ label }) {
  const styles = {
    'Successful Resolution': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'Moderate Risk': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    'High Reopen Risk': 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${styles[label] || 'bg-slate-800 text-slate-400'}`}>
      {label}
    </span>
  );
}

export default function ResolutionPredictionDashboard({ showToast }) {
  const [dashboard, setDashboard] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [filter, setFilter] = useState('all');

  const fetchData = async () => {
    try {
      const [dashRes, metricsRes, predRes] = await Promise.all([
        fetch('/api/resolution/dashboard'),
        fetch('/api/resolution/model-metrics'),
        fetch('/api/resolution/predictions'),
      ]);
      const dashData = await dashRes.json();
      const metricsData = await metricsRes.json();
      const predData = await predRes.json();

      if (dashData.success) setDashboard(dashData.dashboard);
      if (metricsData.success) setMetrics(metricsData.metrics);
      if (predData.success) setPredictions(predData.predictions);
    } catch (e) {
      showToast('Failed to load resolution prediction data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRetrain = async () => {
    setTraining(true);
    try {
      const res = await fetch('/api/resolution/train', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Model retrained: ${data.best_model} (${data.predictions_count} predictions)`, 'success');
        await fetchData();
      } else {
        showToast(data.message || 'Training failed.', 'error');
      }
    } catch {
      showToast('Training request failed.', 'error');
    } finally {
      setTraining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-10 w-10 border-2 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const dist = dashboard?.prediction_distribution || {};
  const doughnutData = {
    labels: ['Successful', 'Moderate Risk', 'High Reopen'],
    datasets: [{
      data: [dist['Successful Resolution'] || 0, dist['Moderate Risk'] || 0, dist['High Reopen Risk'] || 0],
      backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(245,158,11,0.8)', 'rgba(244,63,94,0.8)'],
      borderColor: ['#10b981', '#f59e0b', '#f43f5e'],
      borderWidth: 1,
    }],
  };

  const deptData = {
    labels: (dashboard?.department_risk || []).map(d => d.department),
    datasets: [
      {
        label: 'Avg Reopen %',
        data: (dashboard?.department_risk || []).map(d => d.avg_reopen),
        backgroundColor: 'rgba(244,63,94,0.6)',
        borderRadius: 6,
      },
      {
        label: 'Success Rate %',
        data: (dashboard?.department_risk || []).map(d => d.success_rate),
        backgroundColor: 'rgba(16,185,129,0.6)',
        borderRadius: 6,
      },
    ],
  };

  const wardData = {
    labels: (dashboard?.ward_reopen_risk || []).map(w => w.ward),
    datasets: [{
      label: 'Avg Reopen Probability %',
      data: (dashboard?.ward_reopen_risk || []).map(w => w.avg_reopen),
      borderColor: '#f43f5e',
      backgroundColor: 'rgba(244,63,94,0.15)',
      fill: true,
      tension: 0.4,
    }],
  };

  const trendData = {
    labels: (dashboard?.monthly_trend || []).map(t => t.month),
    datasets: [
      {
        label: 'Successful',
        data: (dashboard?.monthly_trend || []).map(t => t.successful),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'High Risk',
        data: (dashboard?.monthly_trend || []).map(t => t.high_risk),
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244,63,94,0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const filteredPredictions = predictions.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'high') return p.prediction === 'High Reopen Risk';
    if (filter === 'success') return p.prediction === 'Successful Resolution';
    return p.prediction === 'Moderate Risk';
  });

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            Resolution Success Prediction
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            AI-powered prediction of audit issue recurrence after resolution
          </p>
        </div>
        <button
          onClick={handleRetrain}
          disabled={training}
          className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 font-bold rounded-xl text-sm hover:shadow-lg hover:shadow-teal-500/20 disabled:opacity-50 transition"
        >
          {training ? 'Training Models...' : 'Retrain ML Models'}
        </button>
      </div>

      {/* Model Comparison */}
      {metrics?.models && (
        <div className="glass-panel rounded-2xl border border-slate-800 p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4">Model Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <th className="pb-3 pr-4">Model</th>
                  <th className="pb-3 pr-4">Accuracy</th>
                  <th className="pb-3 pr-4">Precision</th>
                  <th className="pb-3 pr-4">Recall</th>
                  <th className="pb-3 pr-4">F1 Score</th>
                  <th className="pb-3">Selected</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(metrics.models).map(([name, m]) => (
                  <tr key={name} className="border-b border-slate-900/60">
                    <td className="py-3 pr-4 text-slate-200 font-medium">{name}</td>
                    <td className="py-3 pr-4 text-slate-300">{(m.accuracy * 100).toFixed(1)}%</td>
                    <td className="py-3 pr-4 text-slate-300">{(m.precision * 100).toFixed(1)}%</td>
                    <td className="py-3 pr-4 text-slate-300">{(m.recall * 100).toFixed(1)}%</td>
                    <td className="py-3 pr-4 text-teal-400 font-semibold">{(m.f1_score * 100).toFixed(1)}%</td>
                    <td className="py-3">
                      {name === metrics.best_model && (
                        <span className="px-2 py-0.5 bg-teal-500/10 text-teal-400 text-[10px] font-bold rounded border border-teal-500/30">BEST</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {metrics.models[metrics.best_model]?.confusion_matrix && (
            <div className="mt-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Confusion Matrix — {metrics.best_model}
              </h3>
              <div className="grid grid-cols-4 gap-1 max-w-md text-center text-xs">
                <div />
                {(metrics.classes || ['Successful Resolution', 'Moderate Risk', 'High Reopen Risk']).map(c => (
                  <div key={c} className="text-slate-500 font-semibold truncate px-1">{c.split(' ')[0]}</div>
                ))}
                {(metrics.models[metrics.best_model].confusion_matrix || []).map((row, i) => (
                  <React.Fragment key={i}>
                    <div className="text-slate-500 font-semibold flex items-center justify-end pr-2">
                      {(metrics.classes || [])[i]?.split(' ')[0] || i}
                    </div>
                    {row.map((val, j) => (
                      <div
                        key={j}
                        className={`p-2 rounded-lg font-bold ${
                          i === j ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {val}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Resolved Issues" value={dashboard?.total_resolved_issues || 0} color="teal" />
        <StatCard label="Successful Resolutions" value={dashboard?.successful_resolutions || 0} sub={`${dashboard?.resolution_success_rate || 0}% success rate`} color="emerald" />
        <StatCard label="High Reopen Risk" value={dashboard?.high_reopen_risk_issues || 0} sub="Requires intervention" color="rose" />
        <StatCard label="Avg Reopen Probability" value={`${dashboard?.avg_reopen_probability || 0}%`} sub={`${dashboard?.moderate_risk_issues || 0} moderate risk`} color="amber" />
      </div>

      {/* Predictive Insights */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <h2 className="text-lg font-bold text-slate-100 mb-4">Predictive Insights</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {(dashboard?.insights || []).map((insight, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-800">
              <span className="text-lg">{insight.icon}</span>
              <div>
                <p className="text-sm text-slate-200 font-medium">{insight.message}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {insight.audit_id} · Reopen risk {insight.reopen_probability}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Resolution Distribution</h3>
          <div className="h-56">
            <Doughnut data={doughnutData} options={{ ...chartDefaults, scales: undefined }} />
          </div>
        </div>
        <div className="glass-panel rounded-2xl border border-slate-800 p-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Department-wise Risk Analysis</h3>
          <div className="h-56">
            <Bar data={deptData} options={chartDefaults} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Ward-wise Reopen Risk</h3>
          <div className="h-56">
            <Line data={wardData} options={chartDefaults} />
          </div>
        </div>
        <div className="glass-panel rounded-2xl border border-slate-800 p-5">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Monthly Resolution Trend</h3>
          <div className="h-56">
            <Line data={trendData} options={chartDefaults} />
          </div>
        </div>
      </div>

      {/* Top Risk Factors */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <h2 className="text-lg font-bold text-slate-100 mb-4">Top Risk Factors</h2>
        <div className="space-y-3">
          {(dashboard?.top_risk_factors || []).slice(0, 8).map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-6">{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium truncate">{f.feature}</span>
                  <span className="text-teal-400">{(f.importance * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full"
                    style={{ width: `${Math.min(f.importance * 500, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Predictions Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-slate-100">Issue Predictions</h2>
          <div className="flex gap-2">
            {['all', 'high', 'success', 'moderate'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === f
                    ? 'bg-teal-500/10 text-teal-400 border border-teal-500/30'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                }`}
              >
                {f === 'all' ? 'All' : f === 'high' ? 'High Risk' : f === 'success' ? 'Successful' : 'Moderate'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="pb-3 pr-4">Issue ID</th>
                <th className="pb-3 pr-4">Ward</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Success %</th>
                <th className="pb-3 pr-4">Reopen %</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPredictions.slice(0, 20).map(p => (
                <tr key={p.audit_id} className="border-b border-slate-900/60 hover:bg-slate-900/30">
                  <td className="py-3 pr-4 font-mono text-teal-400 text-xs">{p.audit_id}</td>
                  <td className="py-3 pr-4 text-slate-300">{p.ward}</td>
                  <td className="py-3 pr-4 text-slate-400 text-xs">{p.issue_category}</td>
                  <td className="py-3 pr-4 text-emerald-400 font-semibold">{p.success_probability}%</td>
                  <td className="py-3 pr-4 text-rose-400 font-semibold">{p.reopen_probability}%</td>
                  <td className="py-3 pr-4"><PredictionBadge label={p.prediction} /></td>
                  <td className="py-3">
                    <button
                      onClick={() => setSelectedIssue(p)}
                      className="text-xs text-teal-400 hover:text-teal-300 font-semibold"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedIssue(null)}>
          <div className="glass-panel rounded-2xl border border-slate-700 p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-100">{selectedIssue.audit_id}</h3>
                <p className="text-sm text-slate-400">{selectedIssue.ward} · {selectedIssue.issue_category}</p>
              </div>
              <button onClick={() => setSelectedIssue(null)} className="text-slate-500 hover:text-slate-300 text-xl">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{selectedIssue.success_probability}%</div>
                <div className="text-[10px] text-slate-500 uppercase">Success Probability</div>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-rose-400">{selectedIssue.reopen_probability}%</div>
                <div className="text-[10px] text-slate-500 uppercase">Reopen Probability</div>
              </div>
            </div>

            <PredictionBadge label={selectedIssue.prediction} />

            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Explanation</h4>
              <ul className="space-y-2">
                {(selectedIssue.explanation?.bullets || []).map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-teal-400 mt-0.5">•</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {(selectedIssue.explanation?.recommendations || []).map((r, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="text-amber-400">→</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
