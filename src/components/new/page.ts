'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';

export default function NewInspectionForm() {
  const [formData, setFormData] = useState({
    assetId: '',
    condition: 'Good',
    notes: '',
  });
  
  // State to hold the final watermarked photo
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  
  // Reference to the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle standard text inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 📸 MAGIC CAMERA & WATERMARK FUNCTION
  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      // 1. Create a hidden canvas to draw the photo
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // 2. Draw the original photo onto the canvas
      ctx.drawImage(img, 0, 0);

      // 3. Get the exact Current Date and Time
      const currentDateTime = new Date().toLocaleString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });

      // 4. Style the Watermark Text
      const fontSize = canvas.width * 0.04; // Scales text size based on photo resolution
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'rgba(255, 255, 255, 1)'; // Solid White text
      ctx.textAlign = 'right';
      
      // 5. Add a dark shadow behind text so it's readable on bright or dark photos
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      // 6. Stamp the text in the bottom right corner
      const padding = canvas.width * 0.04;
      ctx.fillText(currentDateTime, canvas.width - padding, canvas.height - padding);

      // 7. Save the canvas as a final image URL and put it in our app
      const watermarkedImage = canvas.toDataURL('image/jpeg', 0.9);
      setPhotoUrl(watermarkedImage);
    };

    // Load the file into the image object to trigger the onload above
    img.src = URL.createObjectURL(file);
  };

  // Submit the entire form (Data + Photo)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl) {
      alert("Please capture a photo before saving the inspection.");
      return;
    }
    console.log('Saved Inspection Data:', formData);
    console.log('Saved Photo Data:', photoUrl);
    alert('Inspection and Watermarked Photo Saved Successfully!');
  };

  const inputClassName = "w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white outline-none shadow-sm font-medium";

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Inspection</h1>
          <p className="text-sm text-gray-500">Log asset conditions and capture live photos.</p>
        </div>
        <Link href="/admin/inspections" className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold shadow-sm">
          Back
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* FORM DETAILS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-2">Inspection Details</h2>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Asset ID / Name *</label>
            <input type="text" name="assetId" required value={formData.assetId} onChange={handleChange} placeholder="e.g. LPT-204" className={inputClassName} />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Condition *</label>
            <select name="condition" value={formData.condition} onChange={handleChange} className={inputClassName}>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair (Needs minor repair)</option>
              <option value="Poor">Poor (Needs replacement)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Inspector Notes</label>
            <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} placeholder="Any visible damage?" className={inputClassName} />
          </div>
        </div>

        {/* 📸 CAMERA SECTION */}
        <div className="bg-blue-50/50 p-6 rounded-2xl shadow-sm border border-blue-100 text-center">
          <h2 className="text-lg font-bold text-blue-900 mb-2">Live Photo Capture</h2>
          <p className="text-sm text-blue-700 mb-6">Take a photo of the asset. The exact date and time will be permanently watermarked.</p>
          
          {/* Hidden File Input that forces mobile camera to open */}
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" /* THIS forces the rear camera on phones! */
            onChange={handleCapture}
            ref={fileInputRef}
            className="hidden"
          />

          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-3 w-full sm:w-auto mx-auto transition-all text-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Open Camera & Capture
          </button>

          {/* DISPLAY THE WATERMARKED PHOTO LIVE */}
          {photoUrl && (
            <div className="mt-8">
              <p className="text-sm font-bold text-gray-700 mb-3">Live Watermarked Result:</p>
              <div className="border-4 border-white shadow-md rounded-xl overflow-hidden relative inline-block max-w-full">
                <img src={photoUrl} alt="Inspection Watermarked" className="w-full max-w-md h-auto" />
              </div>
            </div>
          )}
        </div>

        {/* SAVE BUTTON */}
        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all text-lg w-full sm:w-auto"
          >
            Save Inspection Record
          </button>
        </div>

      </form>
    </div>
  );
}
