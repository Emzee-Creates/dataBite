import React, { useState, useEffect } from 'react';
import { 
  Upload, Send, Database, BarChart3, X, Sparkles, Download, LayoutDashboard, 
  Search, ShieldCheck, ChevronRight, List, Layers, Keyboard
} from 'lucide-react';
import html2canvas from 'html2canvas';
import FileUploader from './components/FileUploader';
import DataTable from './components/DataTable';
import Visualizer from './components/Visualizer';
import VoiceInterface from './components/VoiceInterface';
import { generateChartConfig, getDiscoverySuggestions } from './utils/aiLogic';
import { supabase } from './utils/supabaseClient'; // Ensure this file exists

const Dashboard = () => {
  const [dataset, setDataset] = useState(null);
  const [query, setQuery] = useState("");
  const [activeConfig, setActiveConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // --- NEW: FETCH HISTORY FROM SUPABASE ON LOAD ---
  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) console.error("Error fetching history:", error);
      else if (data) setHistory(data);
    };

    fetchHistory();
  }, []);

  // --- KEYBOARD LOGIC ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && dataset) {
        e.preventDefault(); 
        e.stopImmediatePropagation(); 
        const micBtn = document.getElementById('voice-trigger-btn');
        if (micBtn) micBtn.click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dataset]);

  useEffect(() => {
    if (dataset) {
      getDiscoverySuggestions(dataset.columns, dataset.rawData).then(setSuggestions);
    }
  }, [dataset]);

  // --- UPDATED: SUBMIT & SAVE TO CLOUD ---
  const handleQuerySubmit = async (customQuery) => {
    const finalQuery = customQuery || query;
    if (!finalQuery || !dataset) return;
    
    setIsLoading(true);
    const config = await generateChartConfig(finalQuery, dataset.columns, dataset.rawData);
    
    if (config) {
      setActiveConfig(config);
      setQuery(""); 

      // Save to Supabase
      const { data, error } = await supabase
        .from('insights')
        .insert([{
          title: config.title,
          config: config, // Store the whole object in JSONB column
          reasoning: config.reasoning,
          is_forecast: config.isForecast || false
        }])
        .select();

      if (!error && data) {
        setHistory(prev => [data[0], ...prev].slice(0, 10));
      } else {
        console.error("Supabase Save Error:", error);
      }
    }
    setIsLoading(false);
  };

  const exportChart = async () => {
    const el = document.getElementById('chart-container');
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.href = canvas.toDataURL("image/png");
    link.download = "insight.png";
    link.click();
  };

  return (
    <div className="flex h-screen bg-[#F1F5F9] text-slate-900 font-sans antialiased">
      <aside className="w-72 bg-[#0F172A] text-slate-300 flex flex-col shadow-2xl shrink-0">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
            <BarChart3 size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">dataBite</span>
        </div>

        <nav className="flex-1 px-4 space-y-8 overflow-y-auto">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-4">Workspace</div>
            <button 
              onClick={() => setActiveConfig(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${!activeConfig ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'hover:bg-white/5'}`}
            >
              <LayoutDashboard size={18} /> Overview
            </button>
          </div>

          {history.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase mb-4 px-4 flex justify-between">
                <span>Cloud History</span>
                <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[8px]">{history.length}</span>
              </div>
              <div className="space-y-2 px-2">
                {history.map((item, idx) => (
                  <button 
                    key={item.id || idx}
                    onClick={() => setActiveConfig(item.config || item)}
                    className={`w-full text-left p-3 rounded-xl text-xs group transition-all border ${activeConfig?.title === item.title ? 'bg-white/10 border-white/20 text-white' : 'border-transparent hover:bg-white/5 text-slate-400'}`}
                  >
                    <div className="flex items-center gap-2 truncate font-semibold">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.is_forecast ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`} />
                      {item.title}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1 pl-3.5">
                       {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </nav>
        
        {dataset && (
          <div className="p-6 mt-auto">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
               <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                 <kbd className="bg-slate-700 px-1.5 py-0.5 rounded text-white border-b-2 border-slate-900">Space</kbd>
                 <span>Push to talk</span>
               </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 bg-white/50 backdrop-blur-xl border-b flex items-center justify-between px-10 sticky top-0 z-10 shrink-0">
          <h1 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            Explorer <ChevronRight size={14} /> <span className="text-slate-900">{dataset?.name || 'Waiting...'}</span>
          </h1>
          {!dataset && (
            <label htmlFor="file-upload" className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer shadow-lg active:scale-95">
              <Upload size={18} /> Import Dataset
            </label>
          )}
        </header>

        <section className="flex-1 p-10 overflow-y-auto">
          {!dataset ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-20 h-20 bg-white rounded-3xl border flex items-center justify-center mb-6">
                <Search size={32} className="text-slate-300" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Connect your data</h2>
              <FileUploader onDataLoaded={setDataset} />
            </div>
          ) : (
            <div className="w-full max-w-6xl mx-auto h-full">
              {activeConfig ? (
                <div className="h-[calc(100vh-220px)] flex flex-col animate-in fade-in zoom-in-95 duration-500">
                  <div className="bg-white flex-1 rounded-[2.5rem] border shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-8 border-b flex justify-between items-center bg-white/50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600"><Sparkles size={24} /></div>
                        <div>
                          <h3 className="font-bold text-2xl text-slate-800">{activeConfig.title}</h3>
                          {activeConfig.isForecast && (
                            <span className="mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold uppercase ring-1 ring-amber-200">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Forecast Active
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={exportChart} className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white px-6 py-3 rounded-xl border shadow-sm">
                          <Download size={18} /> Export Image
                        </button>
                        <button onClick={() => setActiveConfig(null)} className="p-3 text-slate-400 hover:text-red-500 transition-all"><X size={24} /></button>
                      </div>
                    </div>
                    <div className="flex-1 p-10 min-h-0">
                      <div id="chart-container" className="w-full h-full">
                        <Visualizer config={activeConfig} />
                      </div>
                    </div>
                    <div className="p-8 bg-slate-50 border-t shrink-0">
                       <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">AI Reasoning</p>
                       <p className="text-sm text-slate-600 italic leading-relaxed">"{activeConfig.reasoning}"</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
                  <div className="grid grid-cols-3 gap-6">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => handleQuerySubmit(s)} className="bg-white p-6 rounded-[2rem] border hover:border-blue-300 hover:shadow-lg transition-all text-left group">
                        <p className="text-sm font-bold text-slate-600 leading-relaxed pr-6">"{s}"</p>
                      </button>
                    ))}
                  </div>
                  <DataTable data={dataset.rawData} columns={dataset.columns} />
                </div>
              )}
            </div>
          )}
        </section>

        <div className={`absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl px-6 flex items-center gap-4 transition-all duration-500 z-20 ${!dataset ? 'opacity-0 translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
          <VoiceInterface 
            onCommandReceived={(cmd) => handleQuerySubmit(cmd)} 
            lastResponse={activeConfig?.reasoning} 
          />

          <div className="flex-1 bg-[#0F172A] border border-white/10 rounded-[2rem] shadow-2xl p-3 flex items-center gap-4 focus-within:ring-4 focus-within:ring-blue-500/20 group">
            <div className="pl-4 text-blue-500 group-focus-within:animate-pulse"><Sparkles size={20} /></div>
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuerySubmit()}
              placeholder="Ask for a forecast or use the microphone..."
              className="flex-1 bg-transparent border-none outline-none text-white px-2 py-4 text-sm placeholder:text-slate-500"
            />
            <button 
              onClick={() => handleQuerySubmit()}
              disabled={isLoading || !query}
              className="px-8 py-4 bg-blue-600 text-white rounded-[1.5rem] font-bold text-sm hover:bg-blue-500 disabled:bg-slate-800 transition-all flex items-center gap-2"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-t-white rounded-full animate-spin" /> : <>Process <Send size={16} /></>}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;