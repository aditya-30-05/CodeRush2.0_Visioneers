import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles } from 'lucide-react';

interface AiCopilotButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  hasAdvisory?: boolean;
}

export function AiCopilotButton({ isOpen, onToggle, hasAdvisory }: AiCopilotButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={onToggle}
        className={`relative h-13 w-13 rounded-full p-0 shadow-2xl transition-all duration-300 ${
          isOpen
            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 ring-2 ring-slate-600'
            : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-500 hover:to-cyan-500 shadow-cyan-500/25 ring-2 ring-cyan-400/40 hover:scale-105'
        }`}
        title="Open OrbitOps AI Mission Copilot"
      >
        <div className="relative flex items-center justify-center">
          <Bot className="w-6 h-6" />
          <Sparkles className="w-3 h-3 absolute -top-1 -right-1 text-cyan-300 animate-pulse" />
        </div>

        {/* Proactive Advisory Badge Indicator */}
        {hasAdvisory && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[9px] font-bold text-white items-center justify-center">!</span>
          </span>
        )}
      </Button>
    </div>
  );
}
