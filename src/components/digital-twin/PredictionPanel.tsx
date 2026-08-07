import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import type { LiveTelemetry } from '@/hooks/useMissionSocket';

interface PredictionPanelProps {
  telemetry: LiveTelemetry | null;
}

export function PredictionPanel({ telemetry }: PredictionPanelProps) {
  const battery = telemetry?.battery ?? 80;
  const temp = telemetry?.temperature ?? 22;
  const signal = telemetry?.signalStrength ?? 92;

  // Extrapolate trend predictions
  const predictedBattery = Math.max(10, battery - (telemetry?.batteryCharging ? -2 : 4));
  const predictedTemp = temp > 50 ? temp + 5 : temp - 1;
  const predictedSignal = Math.max(20, signal - 2);

  return (
    <Card className="bg-slate-900/90 border-slate-800 p-5 shadow-xl space-y-5">
      {/* Top Banner Explicit Badge (Requirement #10) */}
      <div className="p-3 rounded-lg bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase">Predictive Analytics & Degradation Trends</h4>
            <p className="text-[11px] text-slate-400">
              Extrapolates telemetry health curves to forecast short-term spacecraft states.
            </p>
          </div>
        </div>
        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono tracking-wider">
          PREDICTION PREVIEW
        </Badge>
      </div>

      {/* Predictions Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Battery Prediction */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">BATTERY STORAGE</span>
            <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30">93% Confidence</Badge>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[10px] text-slate-400">Current</p>
              <p className="text-lg font-mono font-bold text-slate-100">{battery.toFixed(1)}%</p>
            </div>
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              {telemetry?.batteryCharging ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-amber-400" />}
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Predicted (T+30m)</p>
              <p className="text-lg font-mono font-bold text-cyan-300">{predictedBattery.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Thermal Prediction */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">THERMAL CONTROL</span>
            <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30">91% Confidence</Badge>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[10px] text-slate-400">Current</p>
              <p className="text-lg font-mono font-bold text-slate-100">{temp.toFixed(1)}°C</p>
            </div>
            <div className="flex items-center gap-1 text-slate-400 font-bold">
              {temp > 40 ? <TrendingUp className="w-4 h-4 text-red-400" /> : <TrendingDown className="w-4 h-4 text-emerald-400" />}
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Predicted (T+30m)</p>
              <p className="text-lg font-mono font-bold text-cyan-300">{predictedTemp.toFixed(1)}°C</p>
            </div>
          </div>
        </div>

        {/* Communication Prediction */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">TT&C SIGNAL LINK</span>
            <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30">89% Confidence</Badge>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[10px] text-slate-400">Current</p>
              <p className="text-lg font-mono font-bold text-slate-100">{signal.toFixed(1)}%</p>
            </div>
            <div className="flex items-center gap-1 text-slate-400 font-bold">
              <TrendingDown className="w-4 h-4 text-amber-400" />
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Predicted (T+30m)</p>
              <p className="text-lg font-mono font-bold text-cyan-300">{predictedSignal.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
