'use client';

import { useConversation } from '@elevenlabs/react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface ElevenLabsAgentProps {
  agentId?: string;
  context?: string;
  activeFileContext?: any;
  triggerMessage?: string;
}

export default function ElevenLabsAgent({ 
  agentId: initialAgentId, 
  context,
  activeFileContext,
  triggerMessage
}: ElevenLabsAgentProps) {
  const envAgentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || '';
  const [agentId, setAgentId] = useState(initialAgentId || envAgentId);
  const [isSettingId, setIsSettingId] = useState(!initialAgentId && !envAgentId);
  
  const activeFileContextRef = useRef(activeFileContext);
  useEffect(() => {
    activeFileContextRef.current = activeFileContext;
  }, [activeFileContext]);

  const conversation = useConversation({
    onConnect: () => console.log('Connected to ElevenLabs'),
    onDisconnect: () => console.log('Disconnected from ElevenLabs'),
    onMessage: (messageDetail: any) => console.log('Message:', messageDetail),
    onError: (error: any) => console.error('ElevenLabs Error:', error),
    clientTools: {
      get_current_file_info: async () => {
        if (!activeFileContextRef.current) return "No file selected. User might be viewing the dashboard.";
        return JSON.stringify(activeFileContextRef.current);
      },
    },
  });

  const { status, isSpeaking } = conversation;

  // Proactive speech logic: trigger explanation on slide change
  useEffect(() => {
    if (status === 'connected' && triggerMessage) {
      const timer = setTimeout(() => {
        (conversation as any).sendMessage?.(triggerMessage);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [triggerMessage, status, conversation]);

  const toggleConversation = useCallback(async () => {
    if (status === 'connected') {
      await conversation.endSession();
    } else {
      if (!agentId) return alert('Please set your ElevenLabs Agent ID first.');
      try {
        await conversation.startSession({
          agentId,
          connectionType: 'websocket' as any,
          dynamicVariables: {
            user_context: context || 'User is browsing projects.',
          }
        });
      } catch (error) {
        console.error('Failed to start session:', error);
      }
    }
  }, [status, conversation, agentId, context]);

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3 scale-110 md:scale-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isSettingId && (
        <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl shadow-2xl w-64 space-y-3 animate-in fade-in zoom-in-95 duration-500">
          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Dash Agent ID</label>
          <input
            type="text"
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="agent_xxxxxx"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono"
          />
          <button
            onClick={() => setIsSettingId(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black py-2 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-blue-500/20"
          >
            Connect AI
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        {status === 'connected' && (
          <div className="bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-full text-[10px] font-black text-neutral-300 animate-pulse shadow-lg flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? 'bg-blue-500 animate-ping' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]'}`} />
            {isSpeaking ? 'AI Speaking...' : 'Listening...'}
          </div>
        )}
        
        <button
          onClick={toggleConversation}
          className={`p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 group relative ${
            status === 'connected' 
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

      {!isSettingId && !initialAgentId && (
        <button 
          onClick={() => setIsSettingId(true)}
          className="text-[9px] text-neutral-600 hover:text-neutral-400 transition-colors uppercase tracking-[0.2em] font-black pr-1 mr-1"
        >
          Change Agent ID
        </button>
      )}
    </div>
  );
}
