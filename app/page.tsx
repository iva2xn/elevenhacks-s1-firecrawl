'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Globe, Search, Layers, BookOpen, ExternalLink, Sparkles, FolderTree, Code2, Loader2, Info, ChevronLeft, ChevronRight, History, Trash2, Plus, Terminal, Menu, X } from 'lucide-react';
import FileExplainer from '@/components/FileExplainer';
import ElevenLabsAgent from '@/components/ElevenLabsAgent';

interface Project {
  id: string;
  name: string;
  url: string;
  mappedLinks: string[];
  readmeContent: string;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [cache, setCache] = useState<Record<string, any>>({});
  const [isScraping, setIsScraping] = useState(false);

  // LOAD projects from localStorage
  useEffect(() => {
    const savedProjects = localStorage.getItem('repo-mapper-projects');
    const savedCache = localStorage.getItem('repo-mapper-cache');
    
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (e) {
        console.error('Failed to parse projects', e);
      }
    }
    
    if (savedCache) {
      try {
        setCache(JSON.parse(savedCache));
      } catch (e) {
        console.error('Failed to parse cache', e);
      }
    }
  }, []);

  // SAVE projects to localStorage
  useEffect(() => {
    localStorage.setItem('repo-mapper-projects', JSON.stringify(projects));
  }, [projects]);

  // SAVE cache to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('repo-mapper-cache', JSON.stringify(cache));
    } catch (e) {
      // If we hit quota, clear old items (naive approach)
      console.warn("localStorage quota hit, wiping cache for safety.");
      if (Object.keys(cache).length > 50) {
        setCache({});
        localStorage.removeItem('repo-mapper-cache');
      }
    }
  }, [cache]);

  const activeProject = projects.find(p => p.id === selectedProjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to map repository');

      const projectName = repoUrl.split('/').pop() || 'New Project';
      const newProject: Project = {
        id: Date.now().toString(),
        name: projectName,
        url: repoUrl,
        mappedLinks: data.mappedLinks,
        readmeContent: data.readmeContent,
      };

      setProjects(prev => [newProject, ...prev]);
      setSelectedProjectId(newProject.id);
      setActiveIndex(0);
      setRepoUrl('');
      setIsSidebarOpen(false);
      
      // Initial scrape of first 3 items for speed
      scrapeBatch(newProject.mappedLinks.slice(0, 3));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const scrapeBatch = async (links: string[]) => {
    for (const link of links) {
      if (!cache[link]) {
        await scrapeFile(link);
      }
    }
  };

  const scrapeFile = async (fileUrl: string) => {
    try {
      const res = await fetch('/api/explain-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setCache(prev => ({ ...prev, [fileUrl]: { explanation: data.explanation, rawCode: data.rawCode } }));
      }
    } catch (e) {
      console.error('Scrape failed:', fileUrl, e);
    }
  };

  // LAZY SCRAPE: Scrape next few files as user slides
  useEffect(() => {
    if (activeProject && activeProject.mappedLinks[activeIndex + 2]) {
      const link = activeProject.mappedLinks[activeIndex + 2];
      if (!cache[link]) scrapeFile(link);
    }
  }, [activeIndex, activeProject, cache]);

  const removeProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProjectId === id) setSelectedProjectId(null);
  };

  const currentFile = activeProject?.mappedLinks[activeIndex];

  return (
    <main className="flex h-screen bg-black text-white selection:bg-blue-500/30 selection:text-blue-200 overflow-hidden relative">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600 rounded-full blur-[150px] animate-pulse delay-1000" />
      </div>

      {/* MOBILE HEADER (Logo + Burger) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 p-6 flex items-center justify-between bg-black/50 backdrop-blur-md border-b border-neutral-800">
         <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-500" />
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Dashboard</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
      </div>

      {/* DASHBOARD SIDEBAR */}
      <aside className={`
        fixed lg:relative z-40 w-80 h-full bg-neutral-900/50 border-r border-neutral-800 flex flex-col items-stretch backdrop-blur-xl transition-transform duration-500 lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="hidden lg:flex p-6 border-b border-neutral-800 items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-blue-500" />
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Dashboard</h1>
          </div>
          <button 
            onClick={() => setSelectedProjectId(null)}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-24 lg:pt-4 space-y-3 scrollbar-hide">
          <div className="px-2 py-1 text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2">
            <History className="w-3 h-3" />
            Recent Projects ({projects.length})
          </div>
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => { setSelectedProjectId(p.id); setActiveIndex(0); setIsSidebarOpen(false); }}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                selectedProjectId === p.id 
                  ? 'bg-blue-600/10 border-blue-500/30 text-white' 
                  : 'bg-neutral-900 border-transparent text-neutral-400 hover:border-neutral-800 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-bold truncate leading-tight uppercase tracking-wide">{p.name}</span>
                <span className="text-[10px] opacity-40 truncate font-mono">Mapped: {p.mappedLinks.length} files</span>
              </div>
              <button 
                onClick={(e) => removeProject(p.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {projects.length === 0 && (
            <div className="p-8 text-center space-y-2 border-2 border-dashed border-neutral-800 rounded-2xl">
              <Layers className="w-8 h-8 text-neutral-800 mx-auto" />
              <p className="text-[10px] font-black text-neutral-600 uppercase tracking-widest">No Projects Yet</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-neutral-800">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-neutral-600 group hover:text-blue-400 transition-colors cursor-help">
            <Sparkles className="w-4 h-4 group-hover:animate-spin-slow" />
            AI Workspace Online
          </div>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 lg:hidden backdrop-blur-sm animate-in fade-in duration-300"
        />
      )}

      {/* MAIN CONTENT SPACE */}
      <section className="relative flex-1 flex flex-col overflow-y-auto lg:overflow-hidden items-center justify-center pt-24 lg:pt-0">
        {!selectedProjectId ? (
          /* HOMEPAGE: New Project Form */
          <div className="max-w-xl w-full p-8 md:p-12 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="space-y-4 text-center">
              <div className="inline-flex px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black tracking-[0.3em] uppercase">
                Intelligence Mapper
              </div>
              <h2 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500">
                New Project
              </h2>
              <p className="text-neutral-500 text-sm font-medium leading-relaxed">
                Connect a GitHub or GitLab repository. Our AI will map the structure, focus on the code, and explain it to you file-by-file.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="relative group p-1.5 bg-neutral-900 border border-neutral-800 rounded-3xl transition-all duration-500 hover:border-blue-500/30 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-600 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="url"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/ivanivannc/xxx"
                    className="w-full pl-12 pr-4 py-4 bg-transparent focus:outline-none text-neutral-200 placeholder:text-neutral-700 font-bold"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-4 bg-white text-black hover:bg-neutral-200 font-black rounded-2xl active:scale-95 transition-all flex items-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  {loading ? 'Mapping...' : 'Start Map'}
                </button>
              </div>
            </form>

            <div className="grid grid-cols-3 gap-6 pt-12 animate-in fade-in duration-1000 delay-300">
              {[
                { label: 'Code First', icon: Code2, desc: 'Ignores HTML junk.'},
                { label: 'Expert Sync', icon: Sparkles, desc: 'Voice explains live.'},
                { label: 'History', icon: History, desc: 'Save your work.'},
              ].map((f, i) => (
                <div key={i} className="text-center space-y-1.5">
                  <f.icon className="w-5 h-5 text-neutral-800 mx-auto" />
                  <h3 className="text-[10px] font-black uppercase text-neutral-700 tracking-widest">{f.label}</h3>
                  <p className="text-[10px] text-neutral-600 font-medium">{f.desc}</p>
                </div>
              ))}
            </div>
            {error && <p className="text-center text-xs text-red-500 font-black animate-bounce">{error}</p>}
          </div>
        ) : (
          /* PROJECT VIEW: Code Slideshow Workspace */
          <div className="w-full h-full flex flex-col p-8 space-y-12 animate-in fade-in zoom-in-95 duration-700">
            {/* Project Header Info */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Project Explorer</div>
                <h2 className="text-4xl font-black text-white leading-none uppercase tracking-tighter">{activeProject?.name}</h2>
                <div className="flex items-center gap-4 text-xs font-bold text-neutral-600 divide-x divide-neutral-800">
                   <a href={activeProject?.url} target="_blank" className="hover:text-blue-500 transition-colors">Repository View</a>
                   <span className="pl-4 uppercase tracking-[0.2em]">{activeIndex + 1} / {activeProject?.mappedLinks.length} Files mapped</span>
                </div>
              </div>

               <div className="flex items-center gap-2 p-1.5 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-inner">
                 <button 
                  disabled={activeIndex === 0} 
                  onClick={() => setActiveIndex(i => i - 1)}
                  className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl disabled:opacity-20 transition-all active:scale-90"
                 >
                   <ChevronLeft className="w-6 h-6" />
                 </button>
                 <button 
                  disabled={activeIndex === (activeProject?.mappedLinks.length || 0) - 1} 
                  onClick={() => setActiveIndex(i => i + 1)}
                  className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl disabled:opacity-20 transition-all active:scale-90"
                 >
                   <ChevronRight className="w-6 h-6" />
                 </button>
               </div>
            </div>

            {/* SLIDESHOW CONTENT GRID */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12 overflow-hidden items-stretch mb-12">
               {/* Left: Code Slide Card */}
               <div className="relative bg-neutral-900 border border-neutral-800 rounded-[3rem] p-12 shadow-2xl overflow-hidden flex flex-col justify-center min-h-[400px] animate-in fade-in slide-in-from-left-8 duration-1000">
                  <div className="absolute top-0 right-0 p-16 text-blue-500/5 -rotate-12 translate-x-12 -translate-y-12">
                    <Code2 className="w-64 h-64" />
                  </div>
                  <div className="relative space-y-10">
                    <div className="space-y-4">
                      <div className="inline-flex px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-neutral-500 text-[10px] font-black uppercase tracking-[0.3em]">Code Focus</div>
                      <h3 className="text-5xl font-black text-white leading-[1.1] break-all tracking-tighter">
                        {currentFile?.split('/').pop()}
                      </h3>
                      <p className="text-[10px] font-mono text-neutral-600 truncate max-w-sm">
                        {currentFile?.replace('https://github.com/', '')}
                      </p>
                    </div>
                    <div className="flex gap-4">
                       <a href={currentFile} target="_blank" className="flex items-center gap-2 px-6 py-3 bg-neutral-950 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-white transition-all">
                          Source <ExternalLink className="w-3 h-3" />
                       </a>
                    </div>
                  </div>
               </div>

               {/* Right: AI Analysis View */}
               <div className="relative overflow-y-auto scrollbar-hide py-4 pr-4">
                  <FileExplainer 
                    fileUrl={currentFile || ''} 
                    rawCode={cache[currentFile || '']?.rawCode}
                    externalData={cache[currentFile || '']?.explanation} 
                    isLoading={!cache[currentFile || '']}
                  />
               </div>
            </div>

            {/* SYNCED Voice Agent Interface */}
            <ElevenLabsAgent 
              context={activeProject?.readmeContent} 
              fullCodebase={activeProject?.mappedLinks
                .map(link => {
                  const data = cache[link];
                  if (!data) return null;
                  return {
                    fileName: link.split('/').pop(),
                    path: link.replace('https://github.com/', ''),
                    code: data.rawCode,
                    summary: data.explanation?.summary,
                    highlights: data.explanation?.highlights
                  };
                })
                .filter(Boolean)}
              activeFileContext={currentFile ? {
                fileName: currentFile.split('/').pop(),
              } : null}
              triggerMessage={currentFile ? `[EVENT] User navigated to ${currentFile.split('/').pop()}. Call 'get_current_file_info' and summarize its purpose.` : ''}
            />
          </div>
        )}
      </section>
    </main>
  );
}
