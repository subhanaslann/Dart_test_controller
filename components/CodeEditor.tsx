import React, { useRef, useState, useEffect } from 'react';

interface CodeEditorProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  readOnly?: boolean;
  isScanning?: boolean;
  language?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
    label, value, onChange, placeholder, readOnly = false, isScanning = false 
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(Math.max(lines, 1));
  }, [value]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') onChange(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0a] relative group overflow-hidden">
      {/* Window Chrome */}
      <div className="flex items-center justify-between px-3 h-8 bg-[#0f0f11] border-b border-[#27272a] select-none shrink-0">
        <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1 ${readOnly ? 'bg-[#18181b]/50' : 'bg-[#18181b]'} border-t border-x border-[#27272a] rounded-t text-xs`}>
                <span className={`w-2 h-2 rounded-full ${readOnly ? 'bg-zinc-600' : 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]'}`}></span>
                <span className={`text-[10px] font-mono ${readOnly ? 'text-zinc-500' : 'text-zinc-300'}`}>{label}</span>
            </div>
        </div>
         
         {/* Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
             {!readOnly && (
               <label className="cursor-pointer p-1 hover:bg-white/10 rounded text-zinc-500 hover:text-zinc-200 transition-colors">
                  <input type="file" onChange={handleFileUpload} accept=".dart" className="hidden" />
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
               </label>
             )}
        </div>
      </div>

      {/* Editor Surface */}
      <div className="relative flex-grow flex overflow-hidden">
        
        {/* Scanner Effect */}
        {isScanning && (
            <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                <div className="scanner-line animate-scan"></div>
                <div className="scanner-overlay animate-scan"></div>
            </div>
        )}

        {/* Line Gutter */}
        <div className="hidden md:block w-10 bg-[#0f0f11] border-r border-[#27272a] pt-4 text-right pr-3 select-none z-10 shrink-0">
            {Array.from({ length: Math.min(lineCount, 100) }).map((_, i) => (
                <div key={i} className="text-[10px] leading-5 text-zinc-700 font-mono">{i + 1}</div>
            ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          className={`flex-grow w-full p-4 text-xs font-mono leading-5 resize-none focus:outline-none bg-[#050505] 
            ${readOnly ? 'text-zinc-500' : 'text-zinc-300'} 
            ${isScanning ? 'opacity-70 blur-[0.5px]' : 'opacity-100'}
            placeholder-zinc-800 custom-scrollbar transition-all duration-500`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          readOnly={readOnly}
        />
      </div>
      
      {/* Footer Status */}
      <div className="h-5 bg-[#0f0f11] border-t border-[#27272a] flex items-center px-3 gap-4 text-[9px] text-zinc-600 font-mono shrink-0">
         <div className="flex items-center gap-1">
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 2.25h-9A2.25 2.25 0 005.25 4.5v15a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25zM13.5 16.5v-6l4.5 3-4.5 3z"/></svg>
            Dart
         </div>
         <span>{lineCount} LOC</span>
         <span className="ml-auto">{readOnly ? 'READONLY' : 'EDITABLE'}</span>
      </div>
    </div>
  );
};