import React, { useState, useEffect } from 'react';

export default function UploadProof({ user, selectedChecklist, onVerificationComplete, showToast }) {
  const [checklists, setChecklists] = useState([]);
  const [activeChecklistId, setActiveChecklistId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChecklists = async () => {
      try {
        const res = await fetch('/api/checklists');
        const data = await res.json();
        if (data.success) {
          setChecklists(data.checklists);
          
          // Pre-select if passed from dashboard
          if (selectedChecklist) {
            const matched = data.checklists.find(c => c._id === selectedChecklist._id);
            if (matched) {
              setActiveChecklistId(matched._id);
            } else {
              setActiveChecklistId(data.checklists[0]?._id || '');
            }
          } else {
            setActiveChecklistId(data.checklists[0]?._id || '');
          }
        }
      } catch (error) {
        console.error(error);
        showToast("Error fetching checklists from database.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchChecklists();
  }, [selectedChecklist]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const activeChecklist = checklists.find(c => c._id === activeChecklistId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeChecklist) {
      showToast("Please select a checklist.", "error");
      return;
    }
    if (!selectedFile) {
      showToast("Please upload a proof image.", "error");
      return;
    }

    setVerifying(true);
    showToast("Triggering computer vision difference masking and object detection...", "info");

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('checklist_id', activeChecklist._id);
    formData.append('inspector_id', user.email);

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        showToast("Verification complete! AI model evaluation loaded.", "success");
        onVerificationComplete(data);
      } else {
        showToast(data.message || "AI Verification failed.", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("Connection to AI verification engine failed.", "error");
    } finally {
      setVerifying(false);
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
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Upload Verification Proof</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload a proof image of the area. The system will compare it against the reference standard and generate a verification result.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Left Side: Checklist Info & Reference standard */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Checklist Standards</h2>
            
            {checklists.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No checklists configured. Ask manager to add.</p>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Active Checklist</label>
                  <select
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-850 rounded-xl text-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-500 transition"
                    value={activeChecklistId}
                    onChange={(e) => setActiveChecklistId(e.target.value)}
                    disabled={verifying}
                  >
                    {checklists.map((c, idx) => (
                      <option key={idx} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {activeChecklist && (
                  <div className="space-y-3 pt-3 border-t border-slate-900">
                    <div className="text-xs">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Location:</span>
                      <span className="text-slate-300 font-semibold">{activeChecklist.department} • {activeChecklist.ward} • Floor {activeChecklist.floor}</span>
                    </div>

                    <div className="text-xs">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Required Objects:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {activeChecklist.expected_objects.map((obj, i) => (
                          <span key={i} className="text-[9px] font-bold text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-900">
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>

                    {activeChecklist.reference_image_url && (
                      <div className="space-y-1.5">
                        <span className="text-slate-500 block text-[9px] uppercase font-bold">Reference Standard Layout:</span>
                        <div className="h-32 w-full rounded-xl overflow-hidden border border-slate-850 bg-slate-950">
                          <img 
                            src={activeChecklist.reference_image_url} 
                            alt="Reference Standard" 
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Upload and Verification Form */}
        <div className="md:col-span-3">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
            {checklists.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="inline-flex p-4 bg-slate-900 border border-slate-800 rounded-full text-slate-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-slate-400 text-sm font-semibold">No Checklists Assigned</div>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">Please contact your manager to create checklist categories before uploading proofs.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* File Dropzone */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Upload Proof Image</label>
                  
                  {!previewUrl ? (
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-800 border-dashed rounded-xl cursor-pointer hover:bg-slate-900/50 hover:border-teal-500/50 transition">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                          <div className="p-3 bg-slate-900 rounded-xl text-slate-400 mb-3 border border-slate-800">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <p className="text-xs text-slate-300 font-semibold">Upload Proof Image</p>
                          <p className="text-[10px] text-slate-500 mt-1">Supports JPG, PNG, WEBP. Compares side-by-side with reference.</p>
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={verifying} />
                      </label>
                    </div>
                  ) : (
                    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center bg-slate-900/40">
                      <img src={previewUrl} alt="Uploaded Proof" className="max-h-full max-w-full object-contain" />
                      
                      {/* Laser scan animation overlay */}
                      {verifying && (
                        <>
                          <div className="absolute inset-0 bg-teal-500/10 transition-all"></div>
                          <div className="scanner-line"></div>
                          <div className="absolute top-4 left-4 bg-teal-500 text-slate-950 font-bold px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider animate-pulse">
                            AI Verification Processing...
                          </div>
                        </>
                      )}

                      {!verifying && (
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                          className="absolute top-3 right-3 bg-slate-950/80 hover:bg-slate-900 text-rose-400 p-2 rounded-full transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={verifying || !selectedFile}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-extrabold rounded-xl shadow-lg hover:shadow-teal-500/20 active:scale-[0.98] transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-3 text-slate-950" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Running verification analysis...
                    </>
                  ) : (
                    "Trigger AI Proof Verification"
                  )}
                </button>

              </form>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
