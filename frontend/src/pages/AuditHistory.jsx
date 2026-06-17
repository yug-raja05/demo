import React, { useState, useEffect } from 'react';

export default function AuditHistory({ showToast, onNavigate }) {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  
  // Detailed Record Drawer
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/audit-history');
      const data = await res.json();
      if (data.success) {
        setRecords(data.records);
        setFilteredRecords(data.records);
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch audit history.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Filter application
  useEffect(() => {
    let result = records;

    // Search term (Inspector ID or Checklist Name)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => 
        (r.inspector_id && r.inspector_id.toLowerCase().includes(term)) ||
        (r.inspector_name && r.inspector_name.toLowerCase().includes(term)) ||
        (r.checklist_name && r.checklist_name.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter(r => r.status === statusFilter);
    }

    // Department filter
    if (deptFilter !== 'All') {
      result = result.filter(r => r.department === deptFilter);
    }

    setFilteredRecords(result);
  }, [searchTerm, statusFilter, deptFilter, records]);

  // Extract unique departments for filtering options
  const uniqueDepartments = [...new Set(records.map(r => r.department))].filter(Boolean);

  const handleReviewVerdict = (record) => {
    onNavigate('verification-result', { verificationResult: record });
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
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-sans">Audit Logs & History</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review verification submissions, filter by compliance status or location, and deep-dive into vision engine matching metrics.
        </p>
      </div>

      {/* Filters Panel */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-lg">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search by inspector or checklist..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {/* Department Filter */}
          <select
            className="px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-355 text-xs focus:outline-none focus:border-teal-500 transition font-semibold"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="All">All Departments</option>
            {uniqueDepartments.map((dept, i) => (
              <option key={i} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-slate-355 text-xs focus:outline-none focus:border-teal-500 transition font-semibold"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Verified">Verified</option>
            <option value="Partially Verified">Partially Verified</option>
            <option value="Failed">Failed</option>
          </select>

          <button
            onClick={() => { setSearchTerm(''); setStatusFilter('All'); setDeptFilter('All'); }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Main Grid: History Table + Sidebar Detail (if selected) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Table Column */}
        <div className={`glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl ${
          selectedRecord ? 'lg:col-span-8' : 'lg:col-span-12'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase font-semibold bg-slate-900/30">
                  <th className="py-4 px-4">Proof Thumbnail</th>
                  <th className="py-4 px-4">Inspector</th>
                  <th className="py-4 px-4">Checklist</th>
                  <th className="py-4 px-4">Location</th>
                  <th className="py-4 px-4">Similarity</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Verification Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-500 italic text-sm">
                      No matching verification records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedRecord(r)}
                      className={`hover:bg-slate-900/20 cursor-pointer transition text-slate-300 ${
                        selectedRecord && selectedRecord._id === r._id ? 'bg-teal-500/5 border-l-2 border-teal-500' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 rounded-lg border border-slate-850 overflow-hidden bg-slate-950">
                          {r.proof_image_url ? (
                            <img 
                              src={r.proof_image_url} 
                              alt="Proof Thumbnail" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-600">No Img</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{r.inspector_name || r.inspector_id}</td>
                      <td className="py-3 px-4 font-medium">{r.checklist_name}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {r.department} <span className="text-slate-600">•</span> {r.ward}
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
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(r.verification_time).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Record Drawer / Detail Column (4 Cols) */}
        {selectedRecord && (
          <div className="lg:col-span-4 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 shadow-2xl relative animate-slide-up">
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedRecord(null)}
              className="absolute top-4 right-4 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-250 p-1.5 rounded-full border border-slate-800 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-sm font-bold text-slate-200">Audit Detail Record</h3>

            {/* Quick side-by-side thumb preview */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Reference Image</span>
                <div className="h-24 w-full rounded-lg border border-slate-900 overflow-hidden bg-slate-950">
                  <img src={selectedRecord.reference_image_url} alt="Ref" className="h-full w-full object-cover" />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Proof Upload</span>
                <div className="h-24 w-full rounded-lg border border-slate-900 overflow-hidden bg-slate-950">
                  <img src={selectedRecord.proof_image_url} alt="Proof" className="h-full w-full object-cover" />
                </div>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-2.5 text-xs pt-2">
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">Checklist Name</span>
                <span className="font-semibold text-slate-200">{selectedRecord.checklist_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">Compliance Status</span>
                <span className={`font-bold ${
                  selectedRecord.status === 'Verified' 
                    ? 'text-emerald-400' 
                    : selectedRecord.status === 'Partially Verified'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                }`}>{selectedRecord.status}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">SSIM Similarity</span>
                <span className="font-semibold text-teal-400 font-mono">{(selectedRecord.similarity_score * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">ORB Matches</span>
                <span className="font-semibold text-slate-200">{selectedRecord.feature_matches} matches</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">Missing Objects</span>
                <span className="font-semibold text-rose-400">
                  {selectedRecord.explanation_summary?.missing?.join(', ') || 'None'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">Added Objects</span>
                <span className="font-semibold text-cyan-400">
                  {selectedRecord.explanation_summary?.added?.join(', ') || 'None'}
                </span>
              </div>
            </div>

            {/* Explanation Summary */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 space-y-1.5 mt-2">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">AI Summary explanation:</span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {selectedRecord.explanation_bullets?.[0] || 'No summary text available.'}
              </p>
            </div>

            {/* Redirect Button */}
            <button
              onClick={() => handleReviewVerdict(selectedRecord)}
              className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition"
            >
              Open Interactive Report &rarr;
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
