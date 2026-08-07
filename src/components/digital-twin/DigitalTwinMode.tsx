import React from 'react';
import { Button } from '@/components/ui/button';
import { Activity, PlaySquare, FlaskConical, TrendingUp } from 'lucide-react';

export type DigitalTwinModeType = 'LIVE_SIM' | 'REPLAY' | 'WHAT_IF' | 'PREDICTION';

interface DigitalTwinModeProps {
  currentMode: DigitalTwinModeType;
  onModeChange: (mode: DigitalTwinModeType) => void;
}

export function DigitalTwinMode({ currentMode, onModeChange }: DigitalTwinModeProps) {
  const modes: { id: DigitalTwinModeType; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'LIVE_SIM', label: 'LIVE SIM', icon: Activity },
    { id: 'REPLAY', label: 'REPLAY', icon: PlaySquare },
    { id: 'WHAT_IF', label: 'WHAT-IF', icon: FlaskConical, badge: 'SANDBOX' },
    { id: 'PREDICTION', label: 'PREDICTION', icon: TrendingUp, badge: 'PREVIEW' },
  ];

  return (
    <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-lg mb-6">
      <div className="flex items-center gap-1.5">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = currentMode === m.id;
          return (
            <Button
              key={m.id}
              size="sm"
              variant={isActive ? 'default' : 'ghost'}
              onClick={() => onModeChange(m.id)}
              className={`h-8 px-4 text-xs font-bold gap-2 transition-all rounded-lg ${
                isActive
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {m.label}
              {m.badge && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-950/80 border border-slate-700 text-cyan-300">
                  {m.badge}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      <div className="text-[11px] font-mono text-slate-400 pr-3 hidden sm:block">
        OPERATIONAL STATE: <span className="text-emerald-400 font-bold">{currentMode.replace('_', ' ')} ACTIVE</span>
      </div>
    </div>
  );
}
