import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, AreaChart, Area, PieChart, Pie
} from 'recharts';

const Visualizer = ({ config }) => {
  const { chartType, xAxis, yAxis, transformedData } = config;

  if (!transformedData || transformedData.length === 0) return null;

  // --- DATA PREPARATION ---
  const processedData = transformedData.map((d, index) => {
    const isForecast = d.type === 'forecast';
    const isLastActual = !isForecast && (transformedData[index + 1]?.type === 'forecast');
    const isFirstForecast = isForecast && (transformedData[index - 1]?.type !== 'forecast');

    return {
      ...d,
      actualValue: !isForecast || isFirstForecast ? d.value ?? d[yAxis] : null,
      forecastValue: isForecast || isLastActual ? d.value ?? d[yAxis] : null,
      displayValue: d.value ?? d[yAxis]
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload.find(p => p.value !== null)?.payload || payload[0].payload;
      return (
        <div className="bg-zinc-950/90 backdrop-blur-md p-4 border border-white/10 shadow-2xl rounded-2xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
            {data.label || data[xAxis] || label}
          </p>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.4)] ${data.type === 'forecast' ? 'bg-amber-500' : 'bg-white'}`} />
            <p className="text-xl font-black text-white">
              {data.displayValue?.toLocaleString()} 
              {data.type === 'forecast' && (
                <span className="ml-2 text-[9px] text-amber-500 font-black uppercase tracking-widest border border-amber-500/30 px-2 py-0.5 rounded-md">
                  Predicted
                </span>
              )}
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

    // 1. PIE CHART HANDLER
    if (chartType === 'pie') {
      return (
        <PieChart>
          <Pie
            data={processedData}
            dataKey="displayValue"
            nameKey={xAxis}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={8}
            stroke="none"
          >
            {processedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={index % 2 === 0 ? '#f59e0b' : '#d97706'} 
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      );
    }

    // 2. LINE / AREA / FORECAST HANDLER
    if (chartType === 'line' || config.isForecast) {
      return (
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey={xAxis} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="actualValue" 
            stroke="#ffffff" 
            strokeWidth={3} 
            fillOpacity={1} 
            fill="url(#colorActual)" 
            strokeLinecap="round"
          />
          <Area 
            type="monotone" 
            dataKey="forecastValue" 
            stroke="#f59e0b" 
            strokeWidth={3} 
            strokeDasharray="8 5"
            fillOpacity={1} 
            fill="url(#colorForecast)" 
            strokeLinecap="round"
          />
        </AreaChart>
      );
    }

    // 3. BAR CHART HANDLER (Default)
    return (
      <BarChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey={xAxis} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} />
        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} />
        <Tooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} content={<CustomTooltip />} />
        <Bar dataKey="displayValue" radius={[4, 4, 0, 0]} barSize={24}>
          {processedData.map((entry, index) => (
            <Cell 
              key={index} 
              fill={entry.type === 'forecast' ? '#f59e0b' : '#ffffff'} 
              fillOpacity={entry.type === 'forecast' ? 0.8 : 0.9} 
            />
          ))}
        </Bar>
      </BarChart>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChart()}
    </ResponsiveContainer>
  );
};

export default Visualizer;  