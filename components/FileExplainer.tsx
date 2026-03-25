'use client';

import { Sparkles, CheckCircle, Info, Loader2 } from 'lucide-react';
import { useEffect, useRef, useMemo } from 'react';

interface FileExplainerProps {
  fileUrl: string;
  rawCode?: string;
  externalData?: {
    summary: string;
    highlights: Array<{ feature: string; explanation: string }>;
    targetAudienceNotice: string;
  };
  isLoading?: boolean;
  activeHighlight?: string | null;
  onExplainBlock?: (code: string) => void;
  children?: React.ReactNode;
}

export default function FileExplainer({ 
  fileUrl, 
  rawCode, 
  externalData, 
  isLoading, 
  activeHighlight,
  onExplainBlock,
  children 
}: FileExplainerProps) {
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (activeHighlight && codeRef.current) {
      const elements = codeRef.current.querySelectorAll('.ai-highlight');
      if (elements.length > 0) {
        elements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeHighlight]);

  const highlightedCode = useMemo(() => {
    if (!rawCode) return null;
    if (!activeHighlight) return rawCode;

    // Use regex to find the highlight text, being careful with special characters
    const escapedHighlight = activeHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = rawCode.split(new RegExp(`(${escapedHighlight})`, 'gi'));

    return parts.map((part, i) => {
      if (part.toLowerCase() === activeHighlight.toLowerCase()) {
        return (
          <span 
            key={i} 
            className="ai-highlight bg-blue-500/30 text-white px-1 rounded border border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-in zoom-in-95 duration-500"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }, [rawCode, activeHighlight]);

  const interactiveBlocks = useMemo(() => {
    if (!rawCode) return null;

    // Split code into blocks by empty lines
    const blocks = rawCode.split(/\n\s*\n/);
    
    return blocks.map((block, i) => {
      // Find where this block appears in the original code to handle highlights correctly
      // For simplicity, we just check if the activeHighlight is in this block
      const hasHighlight = activeHighlight && block.toLowerCase().includes(activeHighlight.toLowerCase());

      return (
        <div 
          key={i}
          onClick={() => onExplainBlock?.(block)}
          className={`
            group relative p-3 my-2 rounded-xl transition-all duration-300 cursor-pointer
            hover:bg-primary/10 hover:ring-2 hover:ring-primary/40
            ${hasHighlight 
              ? 'bg-primary/10 ring-2 ring-primary/60 shadow-[0_0_25px_rgba(59,130,246,0.15)] bg-slate-900/40 border-l-4 border-l-primary' 
              : 'border-l-4 border-l-transparent'
            }
          `}
        >
          <pre className="text-[11px] font-mono text-blue-300/90 leading-relaxed whitespace-pre">
            {hasHighlight && activeHighlight ? (
              block.split(new RegExp(`(${activeHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, j) => {
                if (part.toLowerCase() === activeHighlight.toLowerCase()) {
                  return (
                    <span 
                      key={j} 
                      className="ai-highlight bg-blue-500/40 text-white px-1 rounded shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                    >
                      {part}
                    </span>
                  );
                }
                return part;
              })
            ) : (
              block
            )}
          </pre>
        </div>
      );
    });
  }, [rawCode, activeHighlight, onExplainBlock]);

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 animate-pulse min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Extracting Code...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
      {/* Full Raw Code */}
      {rawCode && (
        <div className="relative bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-secondary/50">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Full Source Code</span>
            <span className="text-[10px] font-mono text-muted-foreground/50">{rawCode.split('\n').length} lines</span>
          </div>
          <div className="max-h-[600px] overflow-auto scrollbar-hide p-4">
            {interactiveBlocks}
          </div>
          
          {/* Slot for Mic Button or other controls */}
          {children && (
            <div className="absolute bottom-6 right-6 z-10 scale-95 md:scale-100">
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
