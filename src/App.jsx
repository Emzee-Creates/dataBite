import React, { useState, useEffect } from 'react';
import { 
  Upload, Send, Database, BarChart3, X, Sparkles, Download, 
  Search, ChevronRight, Layers, LogOut, LogIn, Menu
} from 'lucide-react';
import html2canvas from 'html2canvas';

// COMPONENTS
import FileUploader from './components/FileUploader';
import DataTable from './components/DataTable';
import Visualizer from './components/Visualizer';
import VoiceInterface from './components/VoiceInterface';

// UTILS
import { generateChartConfig, getDiscoverySuggestions } from './utils/aiLogic';
import { generateDataProfile } from './utils/dataProfiler'; 
import { supabase } from './utils/supabaseClient';
import { initDuckDB, runQuery } from './utils/duckdb'; 

const Dashboard = () => {
  const [dataset, setDataset] = useState(null);
  const [query, setQuery] = useState("");
  const [activeConfig, setActiveConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Menu State

  // --- 1. DATASET PERSISTENCE ---
  useEffect(() => {
    const cachedDataset = localStorage.getItem('active_dataset');
    if (cachedDataset) {
      try {
        const parsed = JSON.parse(cachedDataset);
        setDataset(parsed);
      } catch (e) {
        console.error("Failed to parse cached dataset", e);
      }
    }
  }, []);

  useEffect(() => {
    if (dataset) {
      const { fileObject, ...metadata } = dataset;
      localStorage.setItem('active_dataset', JSON.stringify(metadata));
      getDiscoverySuggestions(dataset.columns, dataset.rawData).then(setSuggestions);
    }
  }, [dataset]);

  const handleClearDataset = () => {
    setDataset(null);
    localStorage.removeItem('active_dataset');
    setActiveConfig(null);
  };

  // --- 2. AUTH & HISTORY ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setHistory([]);
        return;
      }
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (!error && data) setHistory(data);
    };
    fetchHistory();
  }, [user]);

  const filteredHistory = history.filter(item => 
    item.title?.toLowerCase().includes(historySearch.toLowerCase())
  );

  const handleQuerySubmit = async (customQuery) => {
    const finalQuery = customQuery || query;
    if (!finalQuery || !dataset) return;
    
    if (!dataset.fileObject) {
      alert("Please re-upload your CSV to enable local SQL analysis.");
      return;
    }

    setIsSidebarOpen(false); // Auto-close sidebar on mobile
    setIsLoading(true);
    try {
      const dataProfile = generateDataProfile(dataset.rawData, dataset.columns);
      const aiBlueprint = await generateChartConfig(finalQuery, dataProfile, activeConfig);
      
      if (aiBlueprint && aiBlueprint.sql) {
        await initDuckDB(dataset.fileObject); 
        const queryResults = await runQuery(aiBlueprint.sql);

        const finalConfig = {
          ...aiBlueprint,
          transformedData: queryResults.map(row => ({
            ...row,
            type: aiBlueprint.isForecast ? 'forecast' : 'actual'
          })),
          id: Date.now() 
        };

        setActiveConfig(finalConfig);
        setQuery(""); 

        if (user) {
          const { data, error } = await supabase
            .from('insights')
            .insert([{
              user_id: user.id,
              title: finalConfig.title,
              config: finalConfig,
              reasoning: finalConfig.reasoning,
              is_forecast: finalConfig.isForecast || false,
            }])
            .select();

          if (!error && data) setHistory(prev => [data[0], ...prev]);
        }
      }
    } catch (error) {
      console.error("Analysis Failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteInsight = async (id, e) => {
    e.stopPropagation(); 
    const { error } = await supabase.from('insights').delete().eq('id', id);
    if (!error) {
      setHistory(prev => prev.filter(item => item.id !== id));
      if (activeConfig?.id === id) setActiveConfig(null);
    }
  };

  const exportChart = async () => {
    const el = document.getElementById('chart-container');
    const canvas = await html2canvas(el, { backgroundColor: '#09090b', scale: 2 });
    const link = document.createElement('a');
    link.href = canvas.toDataURL("image/png");
    link.download = `${activeConfig?.title || 'insight'}.png`;
    link.click();
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#09090b] text-slate-200 font-sans antialiased overflow-hidden">
      
      {/* MOBILE HEADER */}
      <div className="lg:hidden h-16 px-6 bg-zinc-950 border-b border-white/10 flex items-center justify-between z-50">
        <div className="flex items-center gap-2">
           <BarChart3 size={20} className="text-amber-500" />
           <span className="font-bold text-lg tracking-tighter text-white">data<span className="text-amber-500">Bite</span></span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* SIDEBAR (Responsive Overlay) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-zinc-950 border-r border-white/10 flex flex-col transition-transform duration-300 transform
        lg:translate-x-0 lg:static lg:inset-auto
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 hidden lg:flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-black shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <BarChart3 size={24} />
          </div>
          <span className="font-bold text-xl tracking-tighter text-white">data<span className="text-amber-500">Bite</span></span>
        </div>

        <nav className="flex-1 flex flex-col min-h-0 px-4 mt-16 lg:mt-0">
          {user && (
            <>
              <div className="relative mb-6">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search history..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/10 rounded-lg py-2 pl-9 text-[10px] text-slate-300 focus:ring-1 focus:ring-amber-500 outline-none transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                {filteredHistory.map((item) => (
                  <div key={item.id} className="group relative">
                    <button 
                      onClick={() => {
                        setActiveConfig(item.config);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full text-left p-3 rounded-xl text-xs transition-all border ${
                        activeConfig?.title === item.title 
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' 
                        : 'border-transparent text-slate-400 hover:bg-white/[0.03] hover:text-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate font-semibold">
                        {item.is_forecast ? <Layers size={12} className="text-amber-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        {item.title}
                      </div>
                    </button>
                    <button onClick={(e) => deleteInsight(item.id, e)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-slate-500 hover:text-red-400 p-2 transition-all">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </nav>
        
        <div className="p-4 mt-auto border-t border-white/10 bg-white/[0.02]">
          <button 
            onClick={() => user ? supabase.auth.signOut() : supabase.auth.signInWithOAuth({ provider: 'github' })}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] transition-all border border-white/10 group"
          >
            {user ? (
              <img src={user.user_metadata.avatar_url} className="w-8 h-8 rounded-lg border border-amber-500/30" alt="avatar" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-slate-400 border border-white/10">
                <Database size={14} />
              </div>
            )}
            <div className="flex-1 text-left truncate">
              <p className="text-[11px] font-bold text-white truncate">{user ? user.user_metadata.full_name : "Guest Mode"}</p>
              <p className="text-[9px] text-amber-500/70 uppercase font-black tracking-widest">{user ? "Pro Access" : "Sign In"}</p>
            </div>
            {user ? <LogOut size={14} className="text-slate-500 group-hover:text-amber-500" /> : <LogIn size={14} className="text-amber-500" />}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative bg-zinc-900 overflow-hidden">
        <header className="hidden lg:flex h-16 border-b border-white/10 items-center justify-between px-10 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-30">
          <h1 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            Explorer <ChevronRight size={12} className="text-amber-500" /> <span className="text-slate-100">{dataset?.name || 'Awaiting Data'}</span>
          </h1>
          {dataset && (
            <button onClick={handleClearDataset} className="text-[9px] font-black text-slate-500 hover:text-red-400 transition-all uppercase tracking-widest px-3 py-1.5 rounded-lg border border-white/5 hover:border-red-500/20 bg-white/[0.02]">
              Unload File
            </button>
          )}
        </header>

        <section className="flex-1 p-4 md:p-10 overflow-y-auto pb-44 lg:pb-32">
          {!dataset ? (
            <div className="h-full flex items-center justify-center">
              <FileUploader onDataLoaded={setDataset} />
            </div>
          ) : (
            <div className="w-full max-w-6xl mx-auto">
              {activeConfig ? (
                <div className="bg-zinc-950 border border-white/10 rounded-3xl lg:rounded-[2.5rem] overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-500">
                  <div className="p-5 lg:p-8 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.01]">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-500/10 rounded-xl lg:rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20"><Sparkles size={20} /></div>
                      <div>
                        <h3 className="font-bold text-lg lg:text-2xl text-white tracking-tight">{activeConfig.title}</h3>
                        {activeConfig.isForecast && (
                          <span className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase border border-amber-500/20">
                            Predictive
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button onClick={exportChart} className="flex-1 sm:flex-none px-4 py-2.5 border border-white/10 text-slate-300 text-[9px] font-bold rounded-xl hover:bg-white hover:text-black transition-all uppercase tracking-widest">
                        <Download size={14} className="inline mr-2" /> Export
                      </button>
                      <button onClick={() => setActiveConfig(null)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button>
                    </div>
                  </div>
                  <div className="p-4 lg:p-10 h-[300px] lg:h-[450px]">
                    <div id="chart-container" className="w-full h-full">
                      <Visualizer config={activeConfig} />
                    </div>
                  </div>
                  <div className="p-6 lg:p-8 bg-amber-500/5 border-t border-amber-500/10">
                     <p className="text-amber-500 text-[9px] font-black uppercase mb-2 tracking-[0.2em]">Analyst Narrative</p>
                     <p className="text-slate-300 italic leading-relaxed text-xs lg:text-sm">"{activeConfig.reasoning}"</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/5"></div>
                      <h2 className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Sparkles size={12} /> Suggestions
                      </h2>
                      <div className="h-px flex-1 bg-white/5"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {suggestions.map((s, i) => (
                        <button 
                          key={i} 
                          onClick={() => handleQuerySubmit(s)} 
                          className="bg-white/[0.02] border border-white/5 p-5 lg:p-6 rounded-2xl lg:rounded-[1.5rem] hover:border-amber-500/40 hover:bg-white/[0.04] transition-all text-left group"
                        >
                          <p className="text-xs font-bold text-slate-400 group-hover:text-slate-100 leading-relaxed transition-colors">"{s}"</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/5"></div>
                      <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                         Raw Data Preview
                      </h2>
                      <div className="h-px flex-1 bg-white/5"></div>
                    </div>
                    <div className="w-full overflow-hidden">
                       <DataTable data={dataset.rawData} columns={dataset.columns} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* PERSISTENT BOTTOM CONTROL BAR */}
        {dataset && (
          <div className="fixed lg:absolute bottom-0 left-0 right-0 p-4 lg:p-8 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent z-40">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-2 sm:gap-4 bg-zinc-800/90 backdrop-blur-xl border border-white/10 p-2 pl-4 rounded-3xl lg:rounded-[2rem] shadow-2xl">
              <div className="flex items-center w-full sm:w-auto gap-3">
                <VoiceInterface 
                  onCommandReceived={handleQuerySubmit} 
                  lastResponse={activeConfig?.reasoning} 
                  isChartActive={!!activeConfig}
                />
                <div className="hidden sm:block w-[1px] h-8 bg-white/10" />
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQuerySubmit()}
                  placeholder="Ask for an insight..."
                  className="flex-1 sm:hidden lg:flex bg-transparent border-none outline-none text-white px-2 py-3 text-sm placeholder:text-slate-500 font-medium"
                />
              </div>
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuerySubmit()}
                placeholder="Ask for an insight..."
                className="hidden sm:flex lg:hidden flex-1 bg-transparent border-none outline-none text-white px-2 py-3 text-sm placeholder:text-slate-500 font-medium"
              />
              <button 
                onClick={() => handleQuerySubmit()}
                disabled={isLoading || !query}
                className="w-full sm:w-auto bg-amber-500 text-black px-6 lg:px-8 py-3 lg:py-3.5 rounded-2xl lg:rounded-[1.5rem] font-black text-[10px] hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-slate-500 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                {isLoading ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <><Send size={14}/> Analyze</>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;