import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CodeEditor } from './components/CodeEditor';
import { CoverageChart } from './components/CoverageChart';
import { RepoExplorer } from './components/RepoExplorer';
import { analyzeFlutterCoverage, generateMissingTests } from './services/geminiService';
import { GithubService, parseRepoUrl } from './services/githubService';
import { AnalysisReport, AnalysisStatus, GeneratedTestResponse, RepoStructure, FilePair, PackageDependencies, DeepAnalysisContext, FunctionMetadata } from './types';

const Icons = {
    Github: () => <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>,
    Play: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    ChevronDown: () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
    CheckCircle: () => <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    XCircle: () => <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

const DEFAULT_DEPENDENCIES: PackageDependencies = { hasBlocTest: false, hasFreezed: false, hasMocktail: false, hasMockito: false, hasRiverpod: false, hasAutoRoute: false, hasHive: false };

// --- Sub-Component: Interactive Result Card ---
const FunctionReportCard = ({ fn, index }: { fn: FunctionMetadata; index: number }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div 
            className={`border rounded-md overflow-hidden transition-all duration-300 cursor-pointer group
            ${isOpen ? 'bg-[#18181b] border-zinc-700' : 'bg-[#0f0f11] border-[#27272a] hover:border-zinc-600'}`}
            onClick={() => setIsOpen(!isOpen)}
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3 min-w-0">
                    {fn.isTested ? <Icons.CheckCircle /> : <Icons.XCircle />}
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-mono text-zinc-200 truncate">{fn.name}</span>
                        <span className="text-[10px] text-zinc-500 truncate">{fn.signature.substring(0, 30)}...</span>
                    </div>
                </div>
                <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <Icons.ChevronDown />
                </div>
            </div>
            
            <div className={`overflow-hidden transition-[max-height] duration-300 ${isOpen ? 'max-h-40' : 'max-h-0'}`}>
                <div className="p-3 pt-0 text-[11px] text-zinc-400 border-t border-zinc-800 mt-1">
                    <div className="bg-black/30 p-2 rounded border border-white/5">
                         <p className="mb-1 text-zinc-500 uppercase text-[9px] font-bold">Analysis</p>
                         {fn.reason || "No specific details provided."}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default function App() {
  // App State
  const [repoUrl, setRepoUrl] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [repoStructure, setRepoStructure] = useState<RepoStructure | null>(null);
  const [selectedPair, setSelectedPair] = useState<FilePair | null>(null);
  const [deepScanEnabled, setDeepScanEnabled] = useState(false);
  const [deepContext, setDeepContext] = useState<DeepAnalysisContext | undefined>(undefined);

  // Code & Analysis State
  const [prodCode, setProdCode] = useState<string>('');
  const [testCode, setTestCode] = useState<string>('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [generatedTests, setGeneratedTests] = useState<GeneratedTestResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Layout State for Resizable Panes
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [reportWidth, setReportWidth] = useState(320);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);

  // --- Logic ---

  useEffect(() => {
    const storedToken = localStorage.getItem('sentinel_gh_token');
    const storedRepo = localStorage.getItem('sentinel_gh_repo');
    if (storedToken) setGhToken(storedToken);
    if (storedRepo) setRepoUrl(storedRepo);
  }, []);

  // Resizing Logic
  const startResizing = (direction: 'left' | 'right') => (e: React.MouseEvent) => {
     e.preventDefault();
     setIsResizing(direction);
  };

  const stopResizing = useCallback(() => {
      setIsResizing(null);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
      if (isResizing === 'left') {
          setSidebarWidth(Math.max(200, Math.min(e.clientX, 500)));
      } else if (isResizing === 'right') {
          const newWidth = window.innerWidth - e.clientX;
          setReportWidth(Math.max(250, Math.min(newWidth, 600)));
      }
  }, [isResizing]);

  useEffect(() => {
      if (isResizing) {
          window.addEventListener('mousemove', resize);
          window.addEventListener('mouseup', stopResizing);
      }
      return () => {
          window.removeEventListener('mousemove', resize);
          window.removeEventListener('mouseup', stopResizing);
      };
  }, [isResizing, resize, stopResizing]);


  // API Calls
  const loadRepo = async () => {
    if (!repoUrl) return;
    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) return setErrorMsg('Invalid URL');
    localStorage.setItem('sentinel_gh_repo', repoUrl);
    if (ghToken) localStorage.setItem('sentinel_gh_token', ghToken);

    setErrorMsg('');
    setStatus(AnalysisStatus.LOADING_REPO);
    try {
      const service = new GithubService(ghToken);
      const structure = await service.fetchRepoTree(parsed.owner, parsed.repo);
      setRepoStructure(structure);
      setStatus(AnalysisStatus.IDLE);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to load repository");
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleSelectPair = async (pair: FilePair) => {
    setSelectedPair(pair);
    setGeneratedTests(null);
    setReport(null);
    setProdCode('Loading...');
    setTestCode(pair.testFile ? 'Loading...' : '');
    setDeepContext(undefined);
    
    try {
      const service = new GithubService(ghToken);
      const prodContent = await service.fetchFileContent(pair.libFile.url);
      setProdCode(prodContent);
      if (pair.testFile) {
        const testContent = await service.fetchFileContent(pair.testFile.url);
        setTestCode(testContent);
      } else {
        setTestCode(`// Expected path: ${pair.packageRoot}test/${pair.libFile.path.replace(pair.packageRoot+'lib/', '').replace('.dart', '_test.dart')}`);
      }
    } catch (e) {
      setErrorMsg("Failed to fetch files.");
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!prodCode.trim() || prodCode === 'Loading...') return;
    setErrorMsg('');
    setGeneratedTests(null);
    setReport(null);
    let context: DeepAnalysisContext | undefined = undefined;

    try {
        if (deepScanEnabled && repoStructure && selectedPair) {
            setStatus(AnalysisStatus.FETCHING_DEPS);
            const service = new GithubService(ghToken);
            const deps = await service.fetchDeepDependencies(prodCode, selectedPair.libFile.path, repoStructure.rootPackageName, repoStructure.fileMap);
            const linter = await service.fetchLinterRules(repoStructure.fileMap);
            context = { dependencyCode: deps, linterRules: linter };
            setDeepContext(context);
        }

        setStatus(AnalysisStatus.ANALYZING);
        const pkgDeps = repoStructure && selectedPair ? (repoStructure.packages[selectedPair.packageRoot] || DEFAULT_DEPENDENCIES) : DEFAULT_DEPENDENCIES;
        const result = await analyzeFlutterCoverage(prodCode, testCode.startsWith('//') ? '' : testCode, pkgDeps, context);
        setReport(result);
        setStatus(AnalysisStatus.COMPLETE);

    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus(AnalysisStatus.ERROR);
    }
  }, [prodCode, testCode, repoStructure, selectedPair, deepScanEnabled]);

  const handleGenerateTests = async () => {
    if (!report) return;
    const missingFuncs = report.functions.filter(f => !f.isTested).map(f => f.name);
    if (missingFuncs.length === 0) return;
    setStatus(AnalysisStatus.GENERATING_CODE);
    try {
      const pkgDeps = repoStructure && selectedPair ? (repoStructure.packages[selectedPair.packageRoot] || DEFAULT_DEPENDENCIES) : DEFAULT_DEPENDENCIES;
      const result = await generateMissingTests(prodCode, missingFuncs, pkgDeps, deepContext);
      setGeneratedTests(result);
      setStatus(AnalysisStatus.COMPLETE);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus(AnalysisStatus.ERROR);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-black text-zinc-200 font-sans selection:bg-blue-500/30 selection:text-blue-100">
      
      {/* --- Top Command Bar (Floating) --- */}
      <div className="h-14 flex items-center px-6 z-50 shrink-0 bg-black/50 backdrop-blur-md border-b border-white/5">
         {/* Logo */}
         <div className="flex items-center gap-3 mr-8 group cursor-default">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-md flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)] group-hover:shadow-[0_0_25px_rgba(37,99,235,0.8)] transition-all duration-500">
                <span className="text-xs font-bold text-white font-mono">S</span>
            </div>
            <span className="text-sm font-bold tracking-tight text-white">Sentinel</span>
         </div>

         {/* Repo Input */}
         <div className="flex-1 max-w-xl relative group transition-all duration-300 focus-within:max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-blue-400 transition-colors">
                <Icons.Github />
            </div>
            <input 
                className="w-full bg-[#0f0f11] border border-[#27272a] rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-200 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none placeholder-zinc-600 transition-all shadow-inner"
                placeholder="github_username/repo_name"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadRepo()}
            />
         </div>

         {/* Token Input & Actions */}
         <div className="ml-auto flex items-center gap-4">
            <input 
                type="password"
                className="w-24 bg-transparent border-b border-zinc-800 focus:border-zinc-500 text-[10px] text-zinc-400 focus:text-zinc-200 focus:outline-none placeholder-zinc-700 text-center transition-colors"
                placeholder="GH_TOKEN"
                value={ghToken}
                onChange={(e) => setGhToken(e.target.value)}
            />

             {repoStructure && (
                <div 
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => setDeepScanEnabled(!deepScanEnabled)}
                >
                    <span className={`text-[10px] font-medium transition-colors ${deepScanEnabled ? 'text-blue-400' : 'text-zinc-500'}`}>DEEP SCAN</span>
                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${deepScanEnabled ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-zinc-800'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform duration-300 ${deepScanEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                </div>
             )}

             <button 
                onClick={loadRepo}
                disabled={status === AnalysisStatus.LOADING_REPO}
                className="px-4 py-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold rounded shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
             >
                {status === AnalysisStatus.LOADING_REPO ? 'SYNCING...' : 'LOAD REPO'}
             </button>
         </div>
      </div>

      {/* --- Main Interactive Workspace --- */}
      <div className="flex-1 flex overflow-hidden relative">
         
         {/* 1. Resizable Sidebar */}
         <div style={{ width: sidebarWidth }} className="bg-[#050505] flex flex-col shrink-0 z-10 relative">
             {repoStructure ? (
                <RepoExplorer structure={repoStructure} onSelectPair={handleSelectPair} selectedPair={selectedPair} />
             ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 p-8 text-center gap-4 opacity-50">
                    <div className="w-16 h-16 border border-zinc-800 rounded-full flex items-center justify-center">
                         <Icons.Github />
                    </div>
                    <p className="text-xs font-mono">Awaiting Repository Connection...</p>
                </div>
             )}
         </div>
         
         {/* Drag Handle Left */}
         <div className="resizer-col" onMouseDown={startResizing('left')}></div>

         {/* 2. Main Editor Area */}
         <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative">
            
            {/* Breadcrumb Bar */}
            <div className="h-10 flex items-center px-4 text-[10px] font-mono gap-2 border-b border-white/5 bg-black/40">
                {selectedPair ? (
                   <>
                      <span className="text-zinc-500">{repoStructure?.rootPackageName}</span>
                      <span className="text-zinc-700">/</span>
                      <span className="text-blue-400 font-bold">{selectedPair.name}.dart</span>
                      {deepContext && <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">CONTEXT ACTIVE</span>}
                   </>
               ) : (
                   <span className="text-zinc-600">Select a file to begin analysis</span>
               )}
            </div>

            {/* Split Code View */}
            <div className="flex-1 flex flex-col lg:flex-row p-1 gap-1 overflow-hidden">
                <div className="flex-1 h-full min-h-[300px] shadow-2xl shadow-black">
                    <CodeEditor 
                        label="PRODUCTION CODE" 
                        value={prodCode} 
                        onChange={setProdCode} 
                        placeholder="// Select a file from sidebar" 
                        isScanning={status === AnalysisStatus.ANALYZING} 
                    />
                </div>
                <div className="flex-1 h-full min-h-[300px] shadow-2xl shadow-black">
                    <CodeEditor 
                        label="UNIT TEST CODE" 
                        value={testCode} 
                        onChange={setTestCode} 
                        placeholder="// Test code will appear here" 
                        language="dart" 
                        readOnly={false} 
                    />
                </div>
            </div>

            {/* Action Dock */}
            <div className="h-16 flex items-center justify-center shrink-0 bg-gradient-to-t from-black to-transparent px-4 absolute bottom-4 left-0 right-0 pointer-events-none">
                 <div className="pointer-events-auto bg-[#0f0f11]/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-2 flex items-center gap-6 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                      <div className="text-xs flex items-center gap-3 min-w-[120px]">
                            {status === AnalysisStatus.FETCHING_DEPS && <span className="text-amber-500 flex items-center gap-2"><span className="animate-spin">⟳</span> Resolving Context...</span>}
                            {status === AnalysisStatus.ANALYZING && <span className="text-blue-400 flex items-center gap-2"><span className="w-2 h-2 bg-blue-400 rounded-full animate-ping"></span> Analyzing...</span>}
                            {status === AnalysisStatus.IDLE && !errorMsg && <span className="text-zinc-500">Ready</span>}
                            {errorMsg && <span className="text-red-400 font-bold">Error Detected</span>}
                      </div>

                      <div className="h-6 w-px bg-white/10"></div>

                      <button 
                        onClick={handleAnalyze}
                        disabled={!prodCode || status === AnalysisStatus.ANALYZING}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] disabled:opacity-50 disabled:shadow-none"
                    >
                        <Icons.Play /> EXECUTE
                    </button>
                 </div>
            </div>
         </div>

         {/* Drag Handle Right */}
         <div className="resizer-col" onMouseDown={startResizing('right')}></div>

         {/* 3. Resizable Report Panel */}
         <div style={{ width: reportWidth }} className="bg-[#050505] border-l border-white/5 flex flex-col shrink-0 z-10 overflow-hidden relative">
             {/* Panel Header */}
             <div className="h-10 flex items-center px-4 bg-black/20 border-b border-white/5">
                 <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Mission Report</span>
             </div>

             {!report ? (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 gap-2">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-800 flex items-center justify-center animate-pulse-slow">
                        <span className="text-2xl opacity-20">⚡</span>
                    </div>
                    <span className="text-[10px] font-mono">System Idle</span>
                </div>
             ) : (
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
                    
                    {/* Score Visualization */}
                    <div className="relative flex items-center justify-center py-4">
                        <div className="w-32 h-32 relative">
                             <CoverageChart covered={report.testedFunctions} total={report.totalFunctions} />
                             <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                 <span className="text-3xl font-bold text-white drop-shadow-lg">{report.coveragePercentage}%</span>
                                 <span className="text-[9px] text-zinc-500 uppercase">Coverage</span>
                             </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-[#0f0f11] border border-[#27272a] rounded-lg p-3">
                        <div className="text-[9px] text-blue-400 font-bold uppercase mb-2 flex items-center gap-2">
                            <span className="w-1 h-1 bg-blue-400 rounded-full"></span> 
                            AI Assessment
                        </div>
                        <p className="text-[11px] leading-relaxed text-zinc-400">
                            {report.summary}
                        </p>
                    </div>

                    {/* Interactive Function List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">Coverage Details</span>
                            <span className="text-[9px] text-zinc-600">{report.testedFunctions}/{report.totalFunctions} Passing</span>
                        </div>
                        <div className="space-y-1">
                            {report.functions.map((fn, i) => (
                                <FunctionReportCard key={i} fn={fn} index={i} />
                            ))}
                        </div>
                    </div>

                    {/* Generation Actions */}
                    {report.testedFunctions < report.totalFunctions && (
                        <div className="pt-4 border-t border-white/5">
                            <button 
                                onClick={handleGenerateTests}
                                disabled={status === AnalysisStatus.GENERATING_CODE}
                                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {status === AnalysisStatus.GENERATING_CODE ? 'SYNTHESIZING CODE...' : 'GENERATE MISSING TESTS'}
                            </button>

                            {generatedTests && (
                                <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <span className="text-[10px] font-bold text-emerald-400 tracking-wide">GENERATED OUTPUT</span>
                                        <button 
                                            onClick={() => {
                                                const blob = new Blob([generatedTests.code], {type:'text/plain'});
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a'); a.href=url; a.download='test.dart';
                                                a.click();
                                            }}
                                            className="text-[9px] bg-emerald-900/30 px-2 py-1 rounded text-emerald-300 hover:bg-emerald-900/50 border border-emerald-900"
                                        >
                                            DOWNLOAD .DART
                                        </button>
                                    </div>
                                    <div className="p-3 bg-[#050505] border border-emerald-500/20 rounded-lg relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                        <pre className="text-[10px] text-zinc-400 font-mono overflow-x-auto custom-scrollbar max-h-64">
                                            {generatedTests.code}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
             )}
         </div>
      </div>
    </div>
  );
}