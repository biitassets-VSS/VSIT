{/* ========================================== */}
      {/* 2. VIEW DETAILS PAGE (ENHANCED)            */}
      {/* ========================================== */}
      {viewState === 'view_details' && selectedAsset && (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in zoom-in-95 duration-300">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
            <button type="button" onClick={() => setViewState('list')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Back to Assets
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={handleEditClick} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 flex items-center gap-2 shadow-sm"><Pencil size={16} /> Edit</button>
              {selectedAsset.status === 'Assigned' ? (
                <button onClick={() => updateAssetStatus('In Stock (Available)')} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 flex items-center gap-2 shadow-sm"><UserMinus size={16} /> Unassign</button>
              ) : (
                <button onClick={() => setShowAssignModal(true)} className="px-4 py-2 bg-[#008b74] text-white text-sm font-bold rounded-xl hover:bg-[#00705d] flex items-center gap-2 shadow-sm"><User size={16} /> Assign</button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 p-8 border-b border-gray-100 flex justify-between">
              <div>
                <h2 className="text-3xl font-black text-gray-900">{selectedAsset.name}</h2>
                <p className="text-sm font-bold text-gray-500 mt-1 uppercase">{selectedAsset.tagId} • {selectedAsset.category}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-gray-400 uppercase">Inspection Status</p>
                <div className={`flex items-center gap-2 font-black ${selectedAsset.inspectionStatus === 'Passed' ? 'text-[#008b74]' : 'text-red-600'}`}>
                   {selectedAsset.inspectionStatus === 'Passed' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
                   {selectedAsset.inspectionStatus}
                </div>
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Inspection & Photos Section */}
              <div className="space-y-6">
                <h3 className="text-sm font-black text-gray-900 uppercase flex items-center gap-2">
                  <ImageIcon size={16}/> Inspection Verification
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {(selectedAsset.category === 'Laptop' ? laptopPhotoRequirements : standardPhotoRequirements).map((label, idx) => {
                    const photo = selectedAsset.photos?.[idx];
                    return (
                      <div key={idx} className="space-y-2">
                        <p className="text-[10px] font-black text-gray-500 uppercase">{label}</p>
                        {photo ? (
                          <div onClick={() => setInspectionPhoto(photo)} className="aspect-square rounded-xl border border-gray-200 overflow-hidden cursor-pointer hover:opacity-80">
                            <img src={photo} className="w-full h-full object-cover" alt={label} />
                          </div>
                        ) : (
                          <div className="aspect-square rounded-xl border-2 border-dashed border-red-200 bg-red-50 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-red-400">MISSING</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Purchase & Notes */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase mb-4">Asset Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 bg-gray-50 rounded-xl font-bold text-sm"><span>Due Date:</span><span>{selectedAsset.lastInspectionDate}</span></div>
                    <div className="p-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 min-h-[100px]">
                      <strong>Admin Notes:</strong><br/>{selectedAsset.notes || 'No notes available.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}