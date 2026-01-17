import React, { useState, useMemo } from 'react';
import { Table as TableIcon, Hash, Type, Calendar, Search, BarChart2 } from 'lucide-react';

const DataTable = ({ data, columns }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showStats, setShowStats] = useState(false);

  // 1. Calculate Column Stats (Memoized for performance)
  const colStats = useMemo(() => {
    if (!showStats) return {};
    const stats = {};
    columns.forEach(col => {
      const values = data.map(r => r[col]).filter(v => v !== null && v !== undefined);
      if (typeof values[0] === 'number') {
        const sum = values.reduce((a, b) => a + b, 0);
        stats[col] = {
          type: 'num',
          avg: (sum / values.length).toFixed(1),
          max: Math.max(...values)
        };
      } else {
        const unique = new Set(values);
        stats[col] = {
          type: 'text',
          unique: unique.size
        };
      }
    });
    return stats;
  }, [data, columns, showStats]);

  // 2. Filter Logic
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  const getTypeIcon = (value) => {
    if (typeof value === 'number') return <Hash size={12} className="text-amber-500/70" />;
    if (value instanceof Date) return <Calendar size={12} className="text-amber-500/70" />;
    return <Type size={12} className="text-slate-500" />;
  };

  return (
    <div className="w-full bg-zinc-950 border border-white/10 rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full animate-in fade-in duration-700">
      
      {/* HEADER & CONTROLS */}
      <div className="px-4 md:px-8 py-4 md:py-5 border-b border-white/5 bg-white/[0.01] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <TableIcon size={16} className="text-amber-500" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight">Dataset Explorer</h3>
              <p className="text-[9px] md:text-[10px] text-slate-500 font-medium uppercase tracking-widest">Live Preview</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
            <button 
              onClick={() => setShowStats(!showStats)}
              className={`flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-xl border text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                showStats 
                ? 'bg-amber-500 border-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
            >
              <BarChart2 size={12} /> {showStats ? 'Hide Stats' : 'Show Stats'}
            </button>
            <span className="text-[9px] md:text-[10px] whitespace-nowrap font-black text-slate-500 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full uppercase">
              {filteredData.length.toLocaleString()} Records
            </span>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative group">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
          <input 
            type="text"
            placeholder="Search within this dataset..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/5 rounded-xl md:rounded-2xl py-2.5 md:py-3 pl-11 pr-4 text-[11px] md:text-xs text-slate-200 outline-none focus:ring-1 focus:ring-amber-500/50 focus:bg-white/[0.05] transition-all"
          />
        </div>
      </div>

      {/* TABLE CONTAINER: Horizontal Scroll for Mobile */}
      <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[350px] md:max-h-[500px] custom-scrollbar bg-zinc-950">
        <table className="w-full text-left border-collapse text-[12px] md:text-[13px]">
          <thead className="sticky top-0 bg-zinc-950/95 backdrop-blur-xl z-20">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-4 md:px-6 py-3 md:py-4 border-b border-white/5">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(data[0]?.[col])}
                      <span className="font-bold text-slate-200 tracking-tight whitespace-nowrap uppercase text-[10px] md:text-[12px]">{col}</span>
                    </div>
                    {showStats && colStats[col] && (
                      <div className="flex gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                        {colStats[col].type === 'num' ? (
                          <span className="text-[8px] md:text-[9px] text-amber-500/60 font-mono">AVG: {colStats[col].avg}</span>
                        ) : (
                          <span className="text-[8px] md:text-[9px] text-slate-500 font-mono uppercase tracking-tighter">UNIQUE: {colStats[col].unique}</span>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {filteredData.slice(0, 50).map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                {columns.map((col) => (
                  <td key={col} className="px-4 md:px-6 py-3 md:py-4 text-slate-400 whitespace-nowrap group-hover:text-slate-200 font-mono text-[11px] md:text-[12px] border-r border-white/[0.02] last:border-r-0">
                    {row[col]?.toString() || <span className="text-zinc-700 italic text-[10px]">null</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 md:p-4 bg-white/[0.01] text-center border-t border-white/5">
        <p className="text-[8px] md:text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">
          {searchTerm ? `Showing matches for "${searchTerm}"` : "Performance Mode: Showing top 50 rows"}
        </p>
      </div>
    </div>
  );
};

export default DataTable;