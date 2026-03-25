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
}

export default function FileExplainer({ fileUrl, rawCode, externalData, isLoading }: FileExplainerProps) {
  if (isLoading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col items-center justify-center space-y-4 animate-pulse min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm font-bold text-neutral-300 uppercase tracking-wide">Extracting Code...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
      {/* Full Raw Code */}
      {rawCode && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 bg-neutral-950">
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.3em]">Full Source Code</span>
            <span className="text-[10px] font-mono text-neutral-700">{rawCode.split('\n').length} lines</span>
          </div>
          <div className="max-h-[500px] overflow-auto">
            <pre className="p-6 text-[11px] font-mono text-blue-300/90 leading-relaxed whitespace-pre overflow-x-auto">
              <code>{rawCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
