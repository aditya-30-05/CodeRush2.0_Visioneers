import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FlaskConical, Play, RotateCcw, AlertTriangle, ShieldCheck, Zap, Thermometer, Radio, Sun } from 'lucide-react';
import type { LiveTelemetry } from '@/hooks/useMissionSocket';

interface WhatIfSimulationProps {
  liveTelemetry: LiveTelemetry | null;
}

export function WhatIfSimulation({ liveTelemetry }: WhatIfSimulationProps) {
  const [selectedScenarioFaults, setSelectedScenarioFaults] = useState<string[]>([]);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  const currentBattery = liveTelemetry?.battery ?? 80;
  const currentTemp = liveTelemetry?.temperature ?? 22;
  const currentSignal = liveTelemetry?.signalStrength ?? 92;

  // Calculate isolated hypothetical delta predictions
  let predictedBattery = currentBattery;
  let predictedTemp = currentTemp;
  let predictedSignal = currentSignal;
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

  if (selectedScenarioFaults.includes('SOLAR_PANEL_FAILURE')) {
    predictedBattery = Math.max(15, predictedBattery - 25);
    riskLevel = 'HIGH';
  }
  if (selectedScenarioFaults.includes('BATTERY_LEAK')) {
    predictedBattery = Math.max(10, predictedBattery - 35);
    riskLevel = 'CRITICAL';
  }
  if (selectedScenarioFaults.includes('THERMAL_SPIKE')) {
    predictedTemp = Math.min(85, predictedTemp + 28);
    if (riskLevel !== 'CRITICAL') riskLevel = 'HIGH';
  }
  if (selectedScenarioFaults.includes('COMMUNICATION_LOSS')) {
    predictedSignal = Math.max(5, predictedSignal - 55);
    if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
  }

  const toggleFault = (faultId: string) => {
    setSelectedScenarioFaults((prev) =>
      prev.includes(faultId) ? prev.filter((id) => id !== faultId) : [...prev, faultId]
    );
    setIsSimulated(false);
  };

  const handleRunScenario = () => setIsSimulated(true);
  const handleResetScenario = () => {
    setSelectedScenarioFaults([]);
    setIsSimulated(false);
  };

  return (
    <Card className="bg-slate-900/90 border-slate-800 p-5 shadow-xl space-y-5">
      {/* Top Warning Disclaimer Banner */}
      <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <FlaskConical className="w-5 h-5 text-cyan-400 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase">WHAT-IF Isolated Scenario Sandbox</h4>
            <p className="text-[11px] text-slate-400">
              Simulates hypothetical fault impacts on mission risk. <span className="text-cyan-300 font-semibold">Guaranteed zero impact on live satellite or database.</span>
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] border-cyan-500/40 text-cyan-300">ISOLATED MODE</Badge>
      </div>

      {/* Scenario Selection Buttons */}
      <div>
        <h5 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">Select Hypothetical Fault Scenarios</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'SOLAR_PANEL_FAILURE', label: 'Solar Panel Failure', icon: Sun },
            { id: 'BATTERY_LEAK', label: 'Battery Leak Anomaly', icon: Zap },
            { id: 'THERMAL_SPIKE', label: 'Thermal Spike Overheat', icon: Thermometer },
            { id: 'COMMUNICATION_LOSS', label: 'Communication Loss', icon: Radio },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = selectedScenarioFaults.includes(item.id);
            return (
              <Button
                key={item.id}
                size="sm"
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => toggleFault(item.id)}
                className={`h-9 text-xs justify-start gap-2 border-slate-800 ${
                  isSelected
                    ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400'
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleRunScenario}
          disabled={!selectedScenarioFaults.length}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
        >
          <Play className="w-3.5 h-3.5" />
          RUN WHAT-IF SCENARIO
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleResetScenario}
          className="border-slate-700 text-slate-300 text-xs gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Sandbox
        </Button>
      </div>

      {/* Simulation Delta Predictions Output */}
      {isSimulated && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200">Predicted Scenario Impact Analysis</span>
            <Badge
              variant={
                riskLevel === 'CRITICAL' ? 'danger' :
                riskLevel === 'HIGH' ? 'warning' : 'success'
              }
            >
              MISSION RISK: {riskLevel}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase">Battery Impact</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xs text-slate-400 line-through">{currentBattery.toFixed(0)}%</span>
                <span className="text-sm font-mono font-bold text-amber-400">→ {predictedBattery.toFixed(0)}%</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase">Thermal Impact</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xs text-slate-400 line-through">{currentTemp.toFixed(0)}°C</span>
                <span className="text-sm font-mono font-bold text-red-400">→ {predictedTemp.toFixed(0)}°C</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase">Signal Impact</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xs text-slate-400 line-through">{currentSignal.toFixed(0)}%</span>
                <span className="text-sm font-mono font-bold text-cyan-400">→ {predictedSignal.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
