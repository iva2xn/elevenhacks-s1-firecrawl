'use client';

import { Sparkles, CheckCircle, Info, Loader2 } from 'lucide-react';

interface FileExplainerProps {
  fileUrl: string;
  rawCode?: string;
  externalData?: {
    summary: string;
    highlights: Array<{ feature: string; explanation: string }>;
    targetAudienceNotice: string;
  };
  isLoading?: boolean;
  children?: React.ReactNode;
}

export default function FileExplainer({ fileUrl, rawCode, externalData, isLoading, children }: FileExplainerProps) {
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
          <div className="max-h-[600px] overflow-auto scrollbar-hide">
            <pre className="p-6 text-[11px] font-mono text-blue-300/90 leading-relaxed whitespace-pre overflow-x-auto bg-black/20">
              <code>{rawCode}</code>
            </pre>
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
