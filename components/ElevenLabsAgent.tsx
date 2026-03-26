'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface ElevenLabsAgentProps {
  agentId?: string;
  context?: string;
  activeFileContext?: any;
  triggerMessage?: string;
  fullCodebase?: any[];
  allFiles?: any[]; // Added based on instruction
  className?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  onHighlight?: (text: string) => void;
}

export interface ElevenLabsAgentHandle {
  startSession: () => Promise<void>;
}

const ElevenLabsAgent = forwardRef<ElevenLabsAgentHandle, ElevenLabsAgentProps>(({
  agentId: initialAgentId,
  context,
  activeFileContext,
  triggerMessage,
  fullCodebase,
  allFiles,
  className,
  level = 'intermediate',
  onHighlight
}, ref) => {
  const envAgentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || '';
  const agentId = initialAgentId || envAgentId;

  const activeFileContextRef = useRef(activeFileContext);
  const fullCodebaseRef = useRef(fullCodebase);
  const onHighlightRef = useRef(onHighlight);

  useEffect(() => {
    activeFileContextRef.current = activeFileContext;
  }, [activeFileContext]);

  useEffect(() => {
    fullCodebaseRef.current = fullCodebase;
  }, [fullCodebase]);

  useEffect(() => {
    onHighlightRef.current = onHighlight;
  }, [onHighlight]);

  const conversation = useConversation({
    onConnect: () => console.log('Connected to ElevenLabs'),
    onDisconnect: () => console.log('Disconnected from ElevenLabs'),
    onMessage: (messageDetail: any) => console.log('Message:', messageDetail),
    onError: (error: any) => console.error('ElevenLabs Error:', error),
    clientTools: {
      get_codebase_context: async () => {
        if (!fullCodebaseRef.current || fullCodebaseRef.current.length === 0) {
          return "No codebase context available yet. The system is still mapping the repository.";
        }
        return JSON.stringify(fullCodebaseRef.current);
      },
      get_current_file_info: async () => {
        const ctx = activeFileContextRef.current;
        if (!ctx) return "The user is currently on the dashboard.";
        return JSON.stringify(ctx);
      },
      highlight_code_block: async ({ text }: { text: string }) => {
        console.log('[TOOL] highlight_code_block called with:', text);
        if (onHighlightRef.current) {
          onHighlightRef.current(text);
          return `Done.`;
        }
        console.error('[TOOL] onHighlightRef is null!');
        return "Highlight handler not available.";
      },
    },
  });

  const { status, isSpeaking } = conversation;

  const lastSentMessageRef = useRef<string | null>(null);

  // Proactive speech logic: trigger explanation on slide change
  useEffect(() => {
    if (status === 'connected' && triggerMessage && triggerMessage !== lastSentMessageRef.current) {
      const timer = setTimeout(() => {
        (conversation as any).sendUserMessage?.(triggerMessage);
        lastSentMessageRef.current = triggerMessage;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [triggerMessage, status, conversation]);

  const toggleConversation = useCallback(async () => {
    if (status === 'connected') {
      await conversation.endSession();
    } else {
      if (!agentId) return console.error('No ElevenLabs Agent ID provided. Please set NEXT_PUBLIC_ELEVENLABS_AGENT_ID in your environment.');
      try {
        // Build a condensed codebase summary so the AI has it from the start
        let codebaseSummary = '';
        const codebase = fullCodebaseRef.current;
        if (codebase && codebase.length > 0) {
          codebaseSummary = '\n\n--- FULL CODEBASE CONTEXT ---\n' + 
            codebase.map((file: any) => 
              `FILE: ${file.fileName} (${file.path})\nSUMMARY: ${file.summary || 'No summary'}\nCODE:\n${file.code || 'Not loaded'}\n---`
            ).join('\n');
        }

        await conversation.startSession({
          agentId,
          connectionType: 'websocket' as any,
          dynamicVariables: {
            user_context: (context || 'User is browsing projects.') + 
              `The user expertise level is: ${level}. Adjust your tone and complexity accordingly.` +
              "\n\nCRITICAL: You CANNOT navigate to files yourself. Do NOT attempt to use a navigation tool; it has been disabled. The user will navigate manually." + codebaseSummary,
          }
        });
      } catch (error) {
        console.error('Failed to start session:', error);
      }
    }
  }, [status, conversation, agentId, context]);

  useImperativeHandle(ref, () => ({
    startSession: async () => {
      if (status !== 'connected') {
        await toggleConversation();
      }
    }
  }));

  return (
    <div className={`z-50 flex flex-col items-end gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 ${className || 'fixed bottom-8 right-8'}`}>
      <div className="flex items-center gap-3">
        {status === 'connected' && (
          <div className="bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-full text-[10px] font-black text-neutral-300 animate-pulse shadow-lg flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-blue-500 animate-ping' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]'}`} />
            {isSpeaking ? 'AI Speaking...' : 'Listening...'}
          </div>
        )}

        <button
          onClick={toggleConversation}
          className={`p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 group relative ${status === 'connected'
              ? 'bg-red-500/90 hover:bg-red-600 ring-4 ring-red-500/20 shadow-red-500/40'
              : 'bg-blue-600/90 hover:bg-blue-700 ring-4 ring-blue-500/20 shadow-blue-500/40'
            }`}
        >
          {status === 'connecting' ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : status === 'connected' ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}

          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-neutral-800 shadow-xl uppercase tracking-widest pointer-events-none">
            {status === 'connected' ? 'Disconnect' : 'Talk with AI'}
          </div>
        </button>
      </div>
    </div>
  );
});

export default ElevenLabsAgent;
