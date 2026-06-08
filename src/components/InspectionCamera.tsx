'use client';

import React, { useState, useRef } from 'react';

export default function InspectionCamera() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      // Create a canvas to draw the image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Setup Watermark Text (Date and Time)
      const currentDateTime = new Date().toLocaleString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric', 
        hour: '2-digit', minute: '2-digit', second: '2-digit' 
      });

      // Style the Watermark
      const fontSize = canvas.width * 0.04; // Adjust size based on image width
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // White text
      ctx.textAlign = 'right';
      
      // Add a shadow so text is visible on both light and dark backgrounds
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Draw the text in the bottom right corner
      const padding = canvas.width * 0.03;
      ctx.fillText(currentDateTime, canvas.width - padding, canvas.height - padding);

      // Convert canvas back to a usable image URL
      const watermarkedImage = canvas.toDataURL('image/jpeg', 0.9);
      setPhotoUrl(watermarkedImage);
    };

    // Load file into image object
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 w-full max-w-md mx-auto mt-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Inspection Camera</h2>
      
      {/* THE CAMERA INPUT */}
      <div className="flex justify-center">
        {/* capture="environment" forces the back camera on mobile devices */}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          onChange={handleCapture}
          ref={fileInputRef}
          className="hidden"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-md flex items-center gap-2 transition-all"
        >
          📸 Open Camera to Inspect
        </button>
      </div>

      {/* SHOW WATERMARKED PHOTO */}
      {photoUrl && (
        <div className="mt-6 border-2 border-dashed border-gray-300 rounded-xl p-2">
          <p className="text-sm text-gray-500 mb-2 font-medium text-center">Preview (Watermarked):</p>
          <img 
            src={photoUrl} 
            alt="Inspection captured" 
            className="w-full h-auto rounded-lg shadow-sm"
          />
        </div>
      )}
    </div>
  );
}
