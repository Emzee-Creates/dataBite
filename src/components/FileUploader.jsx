import React, { useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle } from 'lucide-react';

const FileUploader = ({ onDataLoaded }) => {
  const processFiles = (files) => {
    const file = files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true, // Automatically converts strings to numbers/booleans
      skipEmptyLines: true,
      complete: (results) => {
        // results.data is now an array of objects
        // results.meta.fields contains the column names
        onDataLoaded({
          name: file.name,
          rawData: results.data,
          columns: results.meta.fields,
          rowCount: results.data.length
        });
      },
      error: (error) => {
        console.error("Parsing error:", error);
      }
    });
  };

  return (
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        processFiles(e.dataTransfer.files);
      }}
      className="w-full max-w-xl p-12 border-2 border-dashed border-slate-200 rounded-3xl bg-white hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group flex flex-col items-center justify-center text-center"
    >
      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Upload size={32} />
      </div>
      <h3 className="text-xl font-semibold text-slate-800 mb-2">Upload your dataset</h3>
      <p className="text-slate-500 mb-6 max-w-xs">
        Drag and drop your CSV or Excel file here to start analyzing.
      </p>
      <input 
        type="file" 
        accept=".csv" 
        className="hidden" 
        id="file-upload" 
        onChange={(e) => processFiles(e.target.files)}
      />
      <label 
        htmlFor="file-upload"
        className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 cursor-pointer shadow-sm transition-all active:scale-95"
      >
        Select File
      </label>
    </div>
  );
};

export default FileUploader;