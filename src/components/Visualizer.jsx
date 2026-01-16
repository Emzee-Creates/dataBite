import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, AreaChart, Area
} from 'recharts';

const Visualizer = ({ config }) => {
  const { chartType, xAxis, yAxis, transformedData } = config;

  if (!transformedData || transformedData.length === 0) return null;

  // --- NEW LOGIC: Prepare data for a seamless "Handshake" ---
  const processedData = transformedData.map((d, index) => {
    const isForecast = d.type === 'forecast';
    const isLastActual = !isForecast && (transformedData[index + 1]?.type === 'forecast');
    const isFirstForecast = isForecast && (transformedData[index - 1]?.type !== 'forecast');

    return {
      ...d,
      // The "Actual" line exists for all actual points PLUS the first forecast point to close the gap
      actualValue: !isForecast || isFirstForecast ? d[yAxis] : null,
      // The "Forecast" line exists for all forecast points PLUS the last actual point to start the gap
      forecastValue: isForecast || isLastActual ? d[yAxis] : null,
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Find the first payload that has a value
      const data = payload.find(p => p.value !== null)?.payload || payload[0].payload;
      return (
        <div className="bg-white p-4 border border-slate-200 shadow-2xl rounded-2xl ring-1 ring-black/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${data.type === 'forecast' ? 'bg-amber-500' : 'bg-blue-600'}`} />
            <p className="text-base font-black text-slate-900">
              {data[yAxis]} 
              {data.type === 'forecast' && <span className="ml-2 text-[10px] text-amber-600 font-bold uppercase tracking-tight">Predicted</span>}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = { 
      data: processedData, 
      margin: { top: 20, right: 30, left: 0, bottom: 20 } 
    };

    if (chartType === 'line' || config.isForecast) {
      return (
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey={xAxis} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Actual Line (Solid Blue) */}
          <Area 
            type="monotone" 
            dataKey="actualValue" 
            stroke="#2563eb" 
            strokeWidth={4} 
            fillOpacity={1} 
            fill="url(#colorActual)" 
            connectNulls={false}
            strokeLinecap="round"
          />

          {/* Forecast Line (Dashed Amber) */}
          <Area 
            type="monotone" 
            dataKey="forecastValue" 
            stroke="#f59e0b" 
            strokeWidth={4} 
            strokeDasharray="10 6"
            fillOpacity={1} 
            fill="url(#colorForecast)" 
            connectNulls={false}
            strokeLinecap="round"
          />
        </AreaChart>
      );
    }

    return (
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey={xAxis} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
        <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
        <Bar dataKey={yAxis} radius={[8, 8, 0, 0]} barSize={40}>
          {processedData.map((entry, index) => (
            <Cell 
              key={index} 
              fill={entry.type === 'forecast' ? '#f59e0b' : '#2563eb'} 
              fillOpacity={entry.type === 'forecast' ? 0.5 : 1} 
            />
          ))}
        </Bar>
      </BarChart>
    );
  };

  return <ResponsiveContainer width="100%" height="100%">{renderChart()}</ResponsiveContainer>;
};

export default Visualizer;