import React, { useState } from 'react';
import { FilePair, RepoStructure } from '../types';

interface RepoExplorerProps {
  structure: RepoStructure;
  onSelectPair: (pair: FilePair) => void;
  selectedPair: FilePair | null;
}

export const RepoExplorer: React.FC<RepoExplorerProps> = ({ structure, onSelectPair, selectedPair }) => {
  const [filter, setFilter] = useState('');

  const filteredPairs = structure.pairs.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.libFile.path.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between shrink-0 border-b border-white/5 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse"></div>
           <span className="text-xs font-bold text-zinc-100 tracking-wide uppercase truncate max-w-[140px]" title={structure.rootPackageName}>
              {structure.rootPackageName || 'ROOT'}
           </span>
        </div>
        <span className="text-[9px] font-mono text-zinc-600 bg-zinc-900/50 px-1.5 py-0.5 rounded border border-zinc-800">
            {structure.pairs.length} FILES
        </span>
      </div>

      {/* Search */}
      <div className="p-3 shrink-0">
        <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <svg className="w-3 h-3 text-zinc-600 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
                type="text"
                placeholder="Search files..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full bg-[#0f0f11] border border-[#27272a] rounded-md pl-8 pr-2 py-1.5 text-[10px] text-zinc-300 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 focus:outline-none placeholder-zinc-700 transition-all"
            />
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2">
        <div className="space-y-1">
        {filteredPairs.map((pair) => {
            const isSelected = selectedPair?.id === pair.id;
            
            // Determine visual status
            let borderColor = 'border-transparent';
            let glowClass = '';
            
            if (isSelected) {
                borderColor = 'border-blue-500/30';
                glowClass = 'bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.1)]';
            }

            return (
            <button
                key={pair.id}
                onClick={() => onSelectPair(pair)}
                className={`w-full text-left p-2 rounded-lg flex flex-col gap-1 transition-all duration-200 border ${borderColor} ${glowClass} hover:bg-[#18181b] group relative overflow-hidden`}
            >
                {/* Selection Highlight Bar */}
                {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>}

                <div className="flex items-center justify-between w-full pl-1">
                    <div className="flex items-center gap-2 min-w-0">
                        <svg className={`w-3.5 h-3.5 shrink-0 transition-colors ${isSelected ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className={`text-[11px] font-mono truncate transition-colors ${isSelected ? 'text-zinc-100 font-medium' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                            {pair.name}.dart
                        </span>
                    </div>
                    
                    {/* Status Pill */}
                    <div className="shrink-0">
                        {pair.matchType === 'exact' && (
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]"></div>
                        )}
                        {pair.matchType === 'fuzzy' && (
                             <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.6)]" title="Fuzzy Match"></div>
                        )}
                        {pair.matchType === 'none' && (
                             <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.6)]" title="No Test"></div>
                        )}
                    </div>
                </div>
                
                {/* Path Detail (Visible on hover or selection) */}
                {(isSelected || filter) && (
                     <div className="text-[9px] text-zinc-600 pl-6 truncate opacity-80">{pair.packageRoot}lib/...</div>
                )}
            </button>
            );
        })}
        </div>
      </div>
      
      {/* Footer Stats */}
      <div className="h-8 border-t border-white/5 flex items-center justify-center gap-4 text-[9px] text-zinc-600 font-mono bg-black/20">
          <span>{structure.unpairedTests.length} Orphan Tests</span>
      </div>
    </div>
  );
};