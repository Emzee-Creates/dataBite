import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, FileText, ShieldCheck, Loader2 } from 'lucide-react';

const FileUploader = ({ onDataLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState("");

  const processFiles = (files) => {
    const file = files[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      preview: 100, 
      complete: (results) => {
        setTimeout(() => {
          onDataLoaded({
            name: file.name,
            rawData: results.data, 
            columns: results.meta.fields,
            rowCount: results.data.length,
            fileObject: file 
          });
          setIsProcessing(false);
        }, 800);
      },
      error: (error) => {
        console.error("Parsing error:", error);
        setIsProcessing(false);
      }
    });
  };

  if (isProcessing) {
    return (
      <div className="w-full max-w-xl p-8 md:p-16 border-2 border-white/10 rounded-3xl md:rounded-[3rem] bg-white/[0.02] flex flex-col items-center justify-center text-center overflow-hidden animate-pulse mx-4">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full" />
          <Loader2 size={40} className="md:size-[48px] text-amber-500 animate-spin relative z-10" />
        </div>
        <div className="mt-6 md:mt-8 space-y-2">
          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-widest">Indexing Data</h3>
          <p className="text-slate-500 text-[10px] md:text-xs font-mono truncate max-w-[200px] md:max-w-none">{fileName}</p>
        </div>
        <div className="mt-8 w-32 md:w-48 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '40%' }} />
        </div>
      </div>
    );
  }

  return (
    <div 
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
      }}
      className={`relative w-full max-w-xl mx-4 p-8 md:p-16 border-2 border-dashed rounded-3xl md:rounded-[3rem] transition-all duration-500 group flex flex-col items-center justify-center text-center overflow-hidden
        ${isDragging 
          ? 'border-amber-500 bg-amber-500/10 scale-[1.02] shadow-[0_0_40px_rgba(245,158,11,0.1)]' 
          : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'}`}
    >
      {/* Background Glow Decor */}
      <div className="absolute -top-12 -right-12 md:-top-24 md:-right-24 w-32 h-32 md:w-48 md:h-48 bg-amber-500/10 blur-[60px] md:blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 md:-bottom-24 md:-left-24 w-32 h-32 md:w-48 md:h-48 bg-amber-500/5 blur-[60px] md:blur-[80px] rounded-full pointer-events-none" />

      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center mb-6 md:mb-8 transition-all duration-500 
        ${isDragging ? 'bg-amber-500 text-black rotate-12' : 'bg-zinc-800 text-amber-500 group-hover:scale-110 group-hover:-rotate-3'}`}>
        <Upload size={30} className="md:size-[38px]" />
      </div>

      <div className="space-y-3 z-10">
        <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
          {isDragging ? "Drop to Analyze" : "Upload Dataset"}
        </h3>
        <p className="text-slate-400 text-xs md:text-sm max-w-[240px] md:max-w-[280px] leading-relaxed mx-auto">
          Drag and drop your <span className="text-amber-500 font-bold">CSV</span> here for local DuckDB processing.
        </p>
      </div>

      <div className="mt-8 md:mt-10 flex flex-col items-center gap-4 z-10 w-full">
        <input 
          type="file" 
          accept=".csv" 
          className="hidden" 
          id="file-upload" 
          onChange={(e) => processFiles(e.target.files)}
        />
        <label 
          htmlFor="file-upload"
          className="w-full sm:w-auto px-8 md:px-10 py-3 md:py-4 bg-amber-500 text-black rounded-xl md:rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] hover:bg-amber-400 cursor-pointer shadow-xl transition-all active:scale-95 text-center"
        >
          Select CSV File
        </label>

        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mt-2">
          <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <ShieldCheck size={12} className="text-emerald-500" /> Private
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-white/10" />
          <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <FileText size={12} /> Local SQL
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;