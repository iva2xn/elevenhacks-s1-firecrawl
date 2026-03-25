'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Globe, Search, Layers, BookOpen, ExternalLink, Sparkles, FolderTree, Code2, Loader2, Info, ChevronLeft, ChevronRight, History, Trash2, Plus, Terminal, Menu, X, ArrowLeft } from 'lucide-react';
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

  const activeProject = projects.find(p => p.id === selectedProjectId);

  const [activeIndex, setActiveIndex] = useState(0);
  const [cache, setCache] = useState<Record<string, any>>({});
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  
  // Reset highlight when project or file changes
  useEffect(() => {
    setActiveHighlight(null);
  }, [selectedProjectId, activeIndex]);

  const handleNavigate = useCallback((fileName: string) => {
    if (!activeProject) return;
    console.log('Attempting to navigate to:', fileName);
    
    // Clean up the search string: remove leading slashes, extra spaces
    const search = fileName.trim().toLowerCase().replace(/^\/+/, '');
    
    const index = activeProject.mappedLinks.findIndex(link => {
      const normalizedLink = link.toLowerCase();
      return normalizedLink.endsWith(search) || normalizedLink.endsWith('/' + search);
    });

    if (index !== -1) {
      console.log('Found match at index:', index, activeProject.mappedLinks[index]);
      setActiveIndex(index);
    } else {
      console.warn('No match found for navigation:', search);
      // Try a looser match: just the filename part
      const justFile = search.split('/').pop() || '';
      const fallbackIndex = activeProject.mappedLinks.findIndex(link => 
        link.toLowerCase().split('/').pop() === justFile
      );
      if (fallbackIndex !== -1) {
        console.log('Found fallback match at index:', fallbackIndex);
        setActiveIndex(fallbackIndex);
      }
    }
  }, [activeProject]);

  const handleHighlight = useCallback((text: string) => {
    setActiveHighlight(text);
  }, []);

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
      console.warn("localStorage quota hit, wiping cache for safety.");
      if (Object.keys(cache).length > 50) {
        setCache({});
        localStorage.removeItem('repo-mapper-cache');
      }
    }
  }, [cache]);

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
    <main className="flex h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary-foreground overflow-hidden font-sans dark">
      {/* DASHBOARD SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-[60] w-80 bg-card border-r border-border flex flex-col items-stretch transition-transform duration-500 lg:translate-x-0 lg:static shrink-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex p-6 border-b border-border items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-foreground">codetalk</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 hover:bg-secondary rounded-lg transition-all text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-3 scrollbar-hide">
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
                  ? 'bg-primary/10 border-primary/30 text-foreground' 
                  : 'bg-secondary border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground'
              }`}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-bold truncate leading-tight uppercase tracking-wide">{p.name}</span>
                <span className="text-[10px] opacity-40 truncate font-mono">Mapped: {p.mappedLinks.length} files</span>
              </div>
              <button 
                onClick={(e) => removeProject(p.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-destructive transition-all"
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
      </aside>

      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-[55] bg-black/60 lg:hidden animate-in fade-in duration-300"
        />
      )}

      {/* RIGHT COLUMN: Header + Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* SHARED HEADER (Sticky) */}
        <header className={`sticky top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-6 py-3 lg:px-10 lg:py-4 bg-background transition-all shrink-0 ${selectedProjectId ? 'border-b border-border/50' : ''}`}>
          {/* LEFT SIDE: Navigation and context title */}
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => selectedProjectId ? setSelectedProjectId(null) : setIsSidebarOpen(true)}
              className="group lg:hidden p-2 bg-secondary border border-border rounded-xl shadow-sm hover:bg-primary hover:border-primary transition-all duration-300"
            >
              {selectedProjectId 
                ? <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors duration-300" /> 
                : <Menu className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors duration-300" />
              }
            </button>
            
            {selectedProjectId && (
              <h1 className="text-lg lg:text-2xl font-black text-foreground leading-none uppercase tracking-tighter truncate">
                {currentFile?.split('/').pop()}
              </h1>
            )}
          </div>

          {/* RIGHT SIDE: Branding (Home) or Actions (Project) */}
          <div className="flex items-center gap-4">
            {!selectedProjectId ? (
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-primary" />
                <h1 className="text-lg lg:text-2xl font-black text-foreground leading-none uppercase tracking-tighter truncate">
                  codetalk
                </h1>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a 
                  href={currentFile} 
                  target="_blank" 
                  className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-accent transition-all shadow-sm"
                >
                  Source <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {/* Desktop Pagination */}
                <div className="hidden lg:flex items-center gap-2">
                  <button 
                    disabled={activeIndex === 0} 
                    onClick={() => setActiveIndex(i => i - 1)}
                    className="p-2 bg-secondary border border-border rounded-xl disabled:opacity-20 transition-all hover:border-accent active:scale-95 shadow-sm"
                  >
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button 
                    disabled={activeIndex === (activeProject?.mappedLinks.length || 0) - 1} 
                    onClick={() => setActiveIndex(i => i + 1)}
                    className="p-2 bg-secondary border border-border rounded-xl disabled:opacity-20 transition-all hover:border-accent active:scale-95 shadow-sm"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* MAIN CONTENT SPACE */}
        <section className={`relative flex-1 flex flex-col overflow-hidden ${!selectedProjectId ? 'items-center justify-center' : ''}`}>
          {!selectedProjectId ? (
            <div className="max-w-xl w-full p-8 md:p-12 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="space-y-4 text-center">
                <h2 className="text-6xl font-black tracking-tighter text-foreground">
                  New Project
                </h2>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                  Connect a GitHub or GitLab repository. Our AI will map the structure, focus on the code, and explain it to you file-by-file.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="relative group p-1.5 bg-card border border-border rounded-3xl transition-all duration-500 hover:border-primary/30 hover:shadow-xl shadow-sm">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="url"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/ivanivannc/xxx"
                      className="w-full pl-12 pr-4 py-4 bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/60 font-bold"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-4 bg-primary text-primary-foreground hover:bg-primary/90 font-black rounded-2xl active:scale-95 transition-all flex items-center gap-3"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    {loading ? 'Mapping...' : 'Start Map'}
                  </button>
                </div>
              </form>

              {error && <p className="text-center text-xs text-destructive font-black animate-bounce">{error}</p>}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-stretch animate-in fade-in zoom-in-95 duration-700 relative">
              <div className="flex-1 overflow-hidden relative">
                <div className="h-full relative overflow-y-auto scrollbar-hide p-6 lg:p-10">
                    <FileExplainer 
                      fileUrl={currentFile || ''} 
                      rawCode={cache[currentFile || '']?.rawCode}
                      externalData={cache[currentFile || '']?.explanation} 
                      isLoading={!cache[currentFile || '']}
                      activeHighlight={activeHighlight}
                    >
                      <ElevenLabsAgent 
                        className="relative bottom-0 right-0"
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
                        onNavigate={handleNavigate}
                        onHighlight={handleHighlight}
                      />
                    </FileExplainer>
                </div>
              </div>

              <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] lg:hidden flex items-center gap-4 p-1.5 bg-card border border-border rounded-2xl shadow-2xl">
                <button 
                  disabled={activeIndex === 0} 
                  onClick={() => setActiveIndex(i => i - 1)}
                  className="p-4 bg-secondary hover:bg-accent rounded-xl disabled:opacity-30 transition-all active:scale-90"
                >
                  <ChevronLeft className="w-6 h-6 text-foreground" />
                </button>
                <div className="w-[1px] h-8 bg-border mx-1" />
                <button 
                  disabled={activeIndex === (activeProject?.mappedLinks.length || 0) - 1} 
                  onClick={() => setActiveIndex(i => i + 1)}
                  className="p-4 bg-secondary hover:bg-accent rounded-xl disabled:opacity-30 transition-all active:scale-90"
                >
                  <ChevronRight className="w-6 h-6 text-foreground" />
                </button>
              </nav>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
