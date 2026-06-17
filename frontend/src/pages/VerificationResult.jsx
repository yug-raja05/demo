import React, { useState } from 'react';

export default function VerificationResult({ result, onReset, onViewHistory }) {
  const [activeTab, setActiveTab] = useState('comparison'); // 'comparison' or 'diff_mask'

  if (!result) return null;

  const status = result.status;
  const isVerified = status === 'Verified';
  const isPartial = status === 'Partially Verified';
  const isFailed = status === 'Failed';

  const dateStr = result.verification_time 
    ? new Date(result.verification_time).toLocaleString()
    : new Date().toLocaleString();

  return (
    <div className="space-y-6 animate-fade-in w-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Audit Report Verdict</h1>
          <p className="text-slate-400 text-sm mt-1">
            End-to-end verification review focused on image comparison, detection output, and object matching.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="px-4 py-2.5 bg-teal-500 hover:bg-teal-650 text-slate-950 font-bold rounded-xl shadow-lg transition text-xs active:scale-[0.98]"
          >
            Submit Another Proof
          </button>
          <button
            onClick={onViewHistory}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-350 font-semibold rounded-xl text-xs transition"
          >
            Go to Audit History
          </button>
        </div>
      </div>

      {/* Alert Warning Banners */}
      {result.alert_triggered && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-lg animate-pulse-slow ${
          result.alert_level === 'supervisor' 
            ? 'bg-rose-950/20 border-rose-500/30 text-rose-300' 
            : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
        }`}>
          <span className="text-lg">{result.alert_level === 'supervisor' ? '🚨' : '⚠'}</span>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              {result.alert_level === 'supervisor' ? 'CRITICAL SUPERVISOR ALERT SENT' : 'COMPLIANCE AUDIT WARNING'}
            </div>
            <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
              {result.alert_level === 'supervisor' 
                ? 'Supervisor alert has been dispatched to MongoDB Atlas Alerts database for immediate supervisor resolution. The similarity is below 50%.'
                : 'A warning flag was attached to this audit. The similarity matches are below 70% standard requirements.'}
            </p>
          </div>
        </div>
      )}

      {/* Side by Side Panel & Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visualizers (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visual Audit Comparison</span>
              
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-900">
                <button
                  onClick={() => setActiveTab('comparison')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${
                    activeTab === 'comparison' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Reference vs Proof
                </button>
                <button
                  onClick={() => setActiveTab('diff_mask')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${
                    activeTab === 'diff_mask' ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Difference Mask
                </button>
              </div>
            </div>

            {activeTab === 'comparison' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Reference Image */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block text-center">Gold-Standard Reference</span>
                  <div className="aspect-square rounded-xl overflow-hidden border border-slate-900 bg-slate-950 relative">
                    {result.reference_image_url ? (
                      <img 
                        src={result.reference_image_url} 
                        alt="Reference Standard" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-600 italic">Reference Unavailable</div>
                    )}
                    <span className="absolute bottom-2 left-2 bg-slate-950/85 px-2 py-0.5 rounded text-[9px] font-mono text-slate-400">EXPECTED LAYOUT</span>
                  </div>
                </div>

                {/* Proof Image */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block text-center font-sans">Annotated Proof Upload</span>
                  <div className="aspect-square rounded-xl overflow-hidden border border-slate-900 bg-slate-950 relative">
                    {result.proof_image_url ? (
                      <img 
                        src={result.proof_image_url} 
                        alt="Annotated Proof" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-600 italic">Proof Image Unavailable</div>
                    )}
                    <span className="absolute bottom-2 left-2 bg-teal-500 text-slate-950 px-2 py-0.5 rounded text-[9px] font-bold uppercase">AI ANNOTATED</span>
                  </div>
                </div>

              </div>
            ) : (
              /* Diff Mask Tab */
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block text-center">Altered Pixel Regions (CV Blending)</span>
                <div className="aspect-[4/3] max-h-[380px] w-full rounded-xl overflow-hidden border border-slate-900 bg-slate-950 relative flex items-center justify-center">
                  {result.diff_mask_url ? (
                    <img 
                      src={result.diff_mask_url} 
                      alt="Difference Mask" 
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-xs text-slate-600 italic">Difference mask visualization not calculated.</div>
                  )}
                  <span className="absolute bottom-2 left-2 bg-slate-950/85 px-2 py-0.5 rounded text-[9px] font-mono text-rose-400">RED HIGHLIGHTS CHANGES</span>
                </div>
              </div>
            )}

          </div>

          {/* Details Drawer */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-wrap gap-6 justify-between text-xs text-slate-400">
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Checklist Task</span>
              <span className="text-slate-200 font-semibold">{result.checklist_name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Location Location</span>
              <span className="text-slate-200 font-semibold">{result.department} • {result.ward}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Submitted By</span>
              <span className="text-slate-200 font-semibold">{result.inspector_name || result.inspector_id}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-slate-500 font-bold block">Verification Time</span>
              <span className="text-slate-200 font-semibold">{dateStr}</span>
            </div>
          </div>
        </div>

        {/* Right Column: AI Explanations & Metrics (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Classification Verdict Card */}
          <div className={`glass-panel p-5 rounded-2xl border-2 shadow-xl relative overflow-hidden flex flex-col justify-between ${
            isVerified ? 'border-emerald-500/20' : isPartial ? 'border-amber-500/20' : 'border-rose-500/20'
          }`}>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Random Forest Classification Verdict</span>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-extrabold tracking-tight ${
                  isVerified ? 'text-emerald-400' : isPartial ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {status}
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-slate-300 font-mono font-bold">Accuracy Confirmed</span>
              </div>
            </div>
          </div>

          {/* Metric cards grid */}
          <div className="grid grid-cols-1 gap-3">
            {/* Altered Pixel Area */}
            <div className="glass-panel p-4 rounded-xl border border-slate-850 space-y-1">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Difference Area</span>
              <div className="text-lg font-extrabold text-teal-400">{result.diff_area_percentage.toFixed(1)}%</div>
              <p className="text-[9px] text-slate-500 leading-tight">Altered image pixel area size.</p>
            </div>

          </div>

          {/* Objects mismatch panel */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Object Verification Scan</h2>
            
            <div className="space-y-3">
              <div className="flex items-start justify-between text-xs border-b border-slate-900 pb-2.5">
                <span className="text-slate-400">Expected checklist objects:</span>
                <span className="font-semibold text-slate-200">{result.explanation_summary?.expected?.join(', ') || 'None'}</span>
              </div>
              <div className="flex items-start justify-between text-xs border-b border-slate-900 pb-2.5">
                <span className="text-slate-400">Detected proof objects:</span>
                <span className="font-semibold text-slate-200">{result.explanation_summary?.detected?.join(', ') || 'None'}</span>
              </div>

              {/* Missing objects lists */}
              <div className="space-y-1 pt-1">
                <span className="text-[9px] uppercase font-bold text-rose-400 tracking-wider block">Objects Missing:</span>
                {result.explanation_summary?.missing?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {result.explanation_summary.missing.map((obj, i) => (
                      <span key={i} className="text-[9px] font-bold text-rose-400 bg-rose-950/40 border border-rose-950 px-2.5 py-0.5 rounded">
                        - {obj}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 italic">None - No objects missing.</span>
                )}
              </div>

              {/* Newly added objects lists */}
              <div className="space-y-1 pt-1.5">
                <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider block">Newly Added Objects:</span>
                {result.explanation_summary?.added?.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {result.explanation_summary.added.map((obj, i) => (
                      <span key={i} className="text-[9px] font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-950 px-2.5 py-0.5 rounded">
                        + {obj}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-500 italic">None - No added objects.</span>
                )}
              </div>
            </div>
          </div>

          {/* Explanation Text Panel */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3.5">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Difference Explanation</h2>
            
            <div className="space-y-2">
              {result.explanation_bullets?.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-350 leading-relaxed">
                  <span className="text-teal-400 mt-0.5">&bull;</span>
                  <p>{bullet}</p>
                </div>
              )) || (
                <p className="text-xs text-slate-500 italic">No explanation generated.</p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
