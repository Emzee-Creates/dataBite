import React from 'react';
import { Table as TableIcon, Hash, Type, Calendar } from 'lucide-react';

const DataTable = ({ data, columns }) => {
  // Helper to show a little icon based on data type
  const getTypeIcon = (value) => {
    if (typeof value === 'number') return <Hash size={12} className="text-blue-400" />;
    if (value instanceof Date) return <Calendar size={12} className="text-green-400" />;
    return <Type size={12} className="text-slate-400" />;
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      {/* Table Header Info */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TableIcon size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-700 text-sm">Raw Data Preview</h3>
        </div>
        <span className="text-xs font-medium text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-md">
          {data.length} total rows
        </span>
      </div>

      {/* Scrollable Container */}
      <div className="overflow-auto flex-1 max-h-[500px]">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="sticky top-0 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)] z-10">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-6 py-3 font-semibold text-slate-600 bg-slate-50 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(data[0][col])}
                    {col}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.slice(0, 50).map((row, i) => (
              <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                {columns.map((col) => (
                  <td key={col} className="px-6 py-3 text-slate-500 whitespace-nowrap group-hover:text-slate-900">
                    {row[col]?.toString() || <span className="text-slate-300 italic">null</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {data.length > 50 && (
        <div className="p-3 bg-slate-50 text-center border-t border-slate-100">
          <p className="text-[11px] text-slate-400 font-medium">
            Showing first 50 rows for performance
          </p>
        </div>
      )}
    </div>
  );
};

export default DataTable;