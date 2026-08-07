import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot, User, Send, X, AlertTriangle, CheckCircle, ShieldAlert, Sparkles, Activity, RefreshCw, Zap
} from 'lucide-react';
import { useMission } from '@/context/MissionContext';

const BACKEND_URL = 'http://localhost:4000';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text?: string;
  type?: 'ANSWER' | 'CONFIRMATION_REQUIRED';
  confirmationData?: {
    action: string;
    params: any;
    message: string;
    confirmText: string;
  };
  advisories?: any[];
  timestamp: string;
}

interface AiCopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onHasAdvisoryChange?: (hasAdvisory: boolean) => void;
}

export function AiCopilotPanel({ isOpen, onClose, onHasAdvisoryChange }: AiCopilotPanelProps) {
  const mission = useMission();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: '🛰️ **OrbitOps AI Mission Copilot Online**\nConnected directly to live simulation engine & database. How can I assist with spacecraft operations today?',
      type: 'ANSWER',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Proactive Mission Advisory Check
  const activeFaults = mission.activeFaults || [];
  const telemetry = mission.telemetry;

  const hasAdvisory = activeFaults.length > 0 || (telemetry?.temperature ?? 22) > 60 || (telemetry?.battery ?? 100) < 30;

  useEffect(() => {
    if (onHasAdvisoryChange) {
      onHasAdvisoryChange(hasAdvisory);
    }
  }, [hasAdvisory, onHasAdvisoryChange]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/copilot/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToSend }),
      });
      const json = await res.json();

      if (json.success && json.data) {
        const payload = json.data;

        if (payload.type === 'CONFIRMATION_REQUIRED') {
          const confirmMsg: ChatMessage = {
            id: `msg-confirm-${Date.now()}`,
            sender: 'ai',
            type: 'CONFIRMATION_REQUIRED',
            confirmationData: {
              action: payload.action,
              params: payload.params,
              message: payload.message,
              confirmText: payload.confirmText,
            },
            timestamp: new Date().toLocaleTimeString(),
          };
          setMessages((prev) => [...prev, confirmMsg]);
        } else {
          const aiMsg: ChatMessage = {
            id: `msg-ai-${Date.now()}`,
            sender: 'ai',
            text: payload.text,
            type: 'ANSWER',
            advisories: payload.advisories,
            timestamp: new Date().toLocaleTimeString(),
          };
          setMessages((prev) => [...prev, aiMsg]);
        }
      } else {
        throw new Error(json.message || 'Copilot service error');
      }
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'ai',
        text: '⚠️ **AI Copilot temporarily unavailable**. Backend simulation status remains online.',
        type: 'ANSWER',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (actionData: { action: string; params: any }) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/copilot/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionData),
      });
      const json = await res.json();

      const resultMsg: ChatMessage = {
        id: `msg-act-${Date.now()}`,
        sender: 'ai',
        text: json.message || 'Action executed successfully.',
        type: 'ANSWER',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, resultMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg-act-err-${Date.now()}`,
        sender: 'ai',
        text: '❌ Action execution failed on backend server.',
        type: 'ANSWER',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAction = () => {
    const cancelMsg: ChatMessage = {
      id: `msg-cancel-${Date.now()}`,
      sender: 'ai',
      text: 'Action cancelled by operator.',
      type: 'ANSWER',
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, cancelMsg]);
  };

  return (
    <Card className="fixed bottom-22 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-8rem)] bg-slate-950/95 border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden backdrop-blur-xl">
      {/* Header Bar */}
      <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600/20 border border-blue-500/40 text-cyan-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              OrbitOps AI Mission Copilot
              <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400">
                ● Connected
              </Badge>
            </h3>
            <p className="text-[10px] text-slate-400">Authoritative Spacecraft Ops Assistant</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7 w-7 p-0 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Proactive Mission Advisory Alert Banner */}
      {hasAdvisory && (
        <div className="px-3.5 py-2 bg-amber-950/80 border-b border-amber-500/40 flex items-center justify-between text-[11px] text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">⚠️ MISSION ADVISORY: System Anomaly Active</span>
          </div>
          <Button
            size="sm"
            variant="link"
            onClick={() => handleSend('Show active faults and advisory recommendation')}
            className="h-auto p-0 text-[10px] text-cyan-300 font-bold underline"
          >
            Inspect
          </Button>
        </div>
      )}

      {/* Messages Thread Container */}
      <div ref={scrollRef} className="flex-1 p-3.5 overflow-y-auto space-y-3 font-sans text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1 mb-1 text-[10px] text-slate-400">
              {m.sender === 'user' ? (
                <>
                  <span>Operator</span>
                  <User className="w-3 h-3 text-cyan-400" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-cyan-400" />
                  <span>AI Copilot</span>
                </>
              )}
              <span className="text-slate-500 ml-1">{m.timestamp}</span>
            </div>

            {/* Answer Message Box */}
            {m.type === 'ANSWER' && (
              <div
                className={`p-3 rounded-xl max-w-[90%] leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                    : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {/* Proactive Advisories inside response */}
                {m.advisories?.map((adv, i) => (
                  <div key={i} className="mt-2.5 p-2 rounded-lg bg-amber-950/60 border border-amber-500/40 text-[11px] text-amber-300">
                    <p className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      {adv.subsystem}: {adv.severity}
                    </p>
                    <p className="mt-0.5">{adv.message}</p>
                    <p className="mt-1 font-semibold text-cyan-300">Recommendation: {adv.recommendation}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Dangerous Action Confirmation Card */}
            {m.type === 'CONFIRMATION_REQUIRED' && m.confirmationData && (
              <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 max-w-[95%] space-y-2.5">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-200 leading-snug">{m.confirmationData.message}</p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => handleConfirmAction(m.confirmationData!)}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 h-7 font-bold"
                  >
                    {m.confirmationData.confirmText}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelAction}
                    className="border-slate-700 text-slate-300 text-xs px-3 h-7 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>Consulting telemetry & database tools...</span>
          </div>
        )}
      </div>

      {/* Quick Action Prompt Chips */}
      <div className="px-3 py-1.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          'Mission Status',
          'Battery Status',
          'Thermal Telemetry',
          'Active Faults',
          'Subsystem Health',
          'Mission Summary',
        ].map((chip) => (
          <button
            key={chip}
            onClick={() => handleSend(chip)}
            className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-cyan-300 whitespace-nowrap transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Form Footer */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputPrompt}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputPrompt(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSend()}
          placeholder="Ask AI Copilot about mission status, telemetry..."
          className="flex-1 bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 h-9 px-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
        <Button
          size="sm"
          onClick={() => handleSend()}
          disabled={!inputPrompt.trim() || isLoading}
          className="bg-blue-600 hover:bg-blue-500 text-white h-9 px-3 shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
