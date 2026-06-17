import React, { useState, useEffect } from 'react';

export default function ChecklistManagement({ showToast }) {
  const [checklists, setChecklists] = useState([]);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [ward, setWard] = useState('');
  const [floor, setFloor] = useState('');
  const [expectedObjects, setExpectedObjects] = useState('');
  
  // File upload state for creating
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Updating existing reference image
  const [updatingChecklistId, setUpdatingChecklistId] = useState(null);
  const [updateFile, setUpdateFile] = useState(null);
  const [updateUploading, setUpdateUploading] = useState(false);

  const fetchChecklists = async () => {
    try {
      const res = await fetch('/api/checklists');
      const data = await res.json();
      if (data.success) {
        setChecklists(data.checklists);
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to fetch checklists.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreateChecklist = async (e) => {
    e.preventDefault();
    if (!name.trim() || !department.trim() || !ward.trim() || !floor.trim() || !expectedObjects.trim()) {
      showToast("Please fill in all checklist fields.", "error");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('department', department);
    formData.append('ward', ward);
    formData.append('floor', floor);
    formData.append('expected_objects', expectedObjects);
    if (selectedFile) {
      formData.append('reference_image', selectedFile);
    }

    try {
      const response = await fetch('/api/checklists', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        showToast("Checklist and reference image registered!", "success");
        // Reset form
        setName('');
        setDepartment('');
        setWard('');
        setFloor('');
        setExpectedObjects('');
        setSelectedFile(null);
        setPreviewUrl(null);
        fetchChecklists();
      } else {
        showToast(data.message || "Failed to create checklist.", "error");
      }
    } catch (error) {
      showToast("Error creating checklist.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRefImage = async (checklistId) => {
    if (!updateFile) {
      showToast("Please select a new reference image.", "error");
      return;
    }
    setUpdateUploading(true);
    const formData = new FormData();
    formData.append('image', updateFile);
    formData.append('checklist_id', checklistId);

    try {
      const response = await fetch('/api/checklists/upload-reference', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        showToast("Reference image updated successfully!", "success");
        setUpdatingChecklistId(null);
        setUpdateFile(null);
        fetchChecklists();
      } else {
        showToast(data.message || "Failed to upload reference.", "error");
      }
    } catch (e) {
      showToast("Server communication error.", "error");
    } finally {
      setUpdateUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">Checklist Configuration</h1>
        <p className="text-slate-400 text-sm mt-1">
          Add new hospital checklist templates, assign departments, define target objects for AI detection, and upload gold-standard reference images.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Form Panel: 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center">
              <svg className="w-5 h-5 mr-2 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Register New Checklist
            </h2>
            
            <form onSubmit={handleCreateChecklist} className="space-y-4 text-xs font-semibold">
              
              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Checklist Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ICU Bed & Monitor Standard"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition font-normal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Department</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Intensive Care"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition font-normal"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Ward / Room</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ICU Ward A"
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition font-normal"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Floor Level</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 3rd Floor"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition font-normal"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Expected Objects to Detect</span>
                  <span className="text-[10px] text-slate-500 font-normal lowercase italic">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. bed, drip stand, monitor"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition font-normal"
                  value={expectedObjects}
                  onChange={(e) => setExpectedObjects(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-slate-400 uppercase tracking-wider mb-1.5">Reference Image Standard</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-slate-800 border-dashed rounded-xl cursor-pointer hover:bg-slate-900/50 hover:border-teal-500/50 transition">
                    <div className="flex flex-col items-center justify-center pt-4 pb-4">
                      <svg className="w-6 h-6 mb-1 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-[10px] text-slate-400"><span className="font-semibold">Click to upload</span> standard reference</p>
                      <p className="text-[8px] text-slate-500 mt-0.5">JPEG, PNG (Max 5MB)</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              {previewUrl && (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-850">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                    className="absolute top-2 right-2 bg-slate-950/80 hover:bg-slate-900 text-rose-400 p-1.5 rounded-full transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold rounded-xl shadow-lg transition active:scale-[0.98]"
              >
                {submitting ? "Registering..." : "Add Hospital Checklist"}
              </button>

            </form>
          </div>
        </div>

        {/* Right List Panel: 3 cols */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 flex flex-col">
            <h2 className="text-lg font-bold text-slate-100 flex items-center">
              <svg className="w-5 h-5 mr-2 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Configured Checklists ({checklists.length})
            </h2>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-10 text-xs text-slate-500">Loading checklists from MongoDB Atlas...</div>
              ) : checklists.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No checklists registered. Use the left form to add.
                </div>
              ) : (
                checklists.map((c, idx) => (
                  <div key={idx} className="p-4 bg-slate-900/40 rounded-2xl border border-slate-900 flex flex-col md:flex-row gap-4 items-start hover:border-slate-850 transition">
                    {/* Image Thumbnail */}
                    <div className="w-full md:w-28 h-28 shrink-0 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative group">
                      {c.reference_image_url ? (
                        <img 
                          src={c.reference_image_url} 
                          alt={c.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600 font-semibold italic text-center p-2">
                          No Reference Image
                        </div>
                      )}
                    </div>

                    {/* Metadata Details */}
                    <div className="flex-1 space-y-2.5 w-full">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-200">{c.name}</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Location: Floor {c.floor} • {c.ward} • {c.department}
                          </p>
                        </div>
                      </div>

                      {/* Expected objects */}
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Target Checklist Objects:</span>
                        <div className="flex flex-wrap gap-1">
                          {c.expected_objects.map((obj, i) => (
                            <span key={i} className="text-[9px] font-semibold text-teal-400 bg-teal-950/40 border border-teal-950 px-2 py-0.5 rounded">
                              {obj}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setUpdatingChecklistId(c._id)}
                          className="px-3 py-1 bg-teal-500 hover:bg-teal-600 text-slate-950 text-[10px] font-bold rounded-lg transition"
                        >
                          Upload Reference Image
                        </button>
                        {c.reference_image_url && (
                          <span className="text-[10px] text-slate-500">Current image already saved</span>
                        )}
                      </div>

                      {/* Update Ref Image form inline */}
                      {updatingChecklistId === c._id && (
                        <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-xl space-y-2 mt-2">
                          <span className="text-[10px] text-slate-350 font-bold block">Select new reference standard image:</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              className="text-[10px] text-slate-400 file:bg-slate-900 file:text-slate-300 file:border file:border-slate-800 file:rounded-lg file:px-2 file:py-1 file:mr-2 cursor-pointer"
                              onChange={(e) => setUpdateFile(e.target.files[0])}
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateRefImage(c._id)}
                              disabled={updateUploading}
                              className="px-3 py-1 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-slate-950 text-[10px] font-bold rounded-lg transition"
                            >
                              {updateUploading ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => { setUpdatingChecklistId(null); setUpdateFile(null); }}
                              className="px-2 py-1 bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-bold rounded-lg hover:text-slate-350"
                            >
                              Cancel
                            </button>
                          </div>
                          {updateFile && (
                            <div className="text-[10px] text-slate-500 truncate">Selected file: {updateFile.name}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
