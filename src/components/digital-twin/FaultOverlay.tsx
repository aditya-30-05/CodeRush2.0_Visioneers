import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertOctagon, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import type { SubsystemComponentId } from './Spacecraft3D';

interface FaultOverlayProps {
  activeFaults: string[];
  selectedComponent: SubsystemComponentId | null;
  onClearFault?: (faultId: string) => void;
}

export function FaultOverlay({ activeFaults, selectedComponent, onClearFault }: FaultOverlayProps) {
  if (!activeFaults.length) return null;

  const faultMetadata: Record<string, {
    name: string;
    subsystem: string;
    severity: 'CRITICAL' | 'WARNING' | 'HIGH';
    description: string;
    affectedComponent: SubsystemComponentId;
    recovery: string;
  }> = {
    SOLAR_PANEL_FAILURE: {
      name: 'Solar Array Deployment / Cell Failure',
      subsystem: 'EPS (Electrical Power Subsystem)',
      severity: 'CRITICAL',
      description: 'Primary solar array panel voltage drop detected. Power generation reduced to sub-nominal threshold.',
      affectedComponent: 'solar',
      recovery: 'Autonomous array orientation repositioning & secondary wing boost.',
    },
    BATTERY_LEAK: {
      name: 'Battery Cell Depletion / Thermal Leak',
      subsystem: 'EPS Energy Storage',
      severity: 'CRITICAL',
      description: 'Li-ion battery cell discharge anomaly. Battery health degrading rapidly under load.',
      affectedComponent: 'battery',
      recovery: 'Isolate damaged cell bank and switch to eclipse preservation mode.',
    },
    THERMAL_SPIKE: {
      name: 'Radiator Thermal Overheating Spike',
      subsystem: 'Thermal Control Subsystem',
      severity: 'HIGH',
      description: 'Core bus temperature exceeded safety threshold (>60°C). Overheating risk to onboard computers.',
      affectedComponent: 'thermal',
      recovery: 'Open active louvres and activate secondary heat pipes.',
    },
    COMMUNICATION_LOSS: {
      name: 'TT&C Signal Attenuation / Blackout',
      subsystem: 'Telecommand & Telemetry',
      severity: 'WARNING',
      description: 'High-gain dish signal degradation. Ground station packet loss exceeding 15%.',
      affectedComponent: 'antenna',
      recovery: 'Re-align dish vector toward ISRO SHAR ground station.',
    },
    REACTION_WHEEL_FAILURE: {
      name: 'ADCS Reaction Wheel Friction Fault',
      subsystem: 'Attitude Determination & Control',
      severity: 'CRITICAL',
      description: 'Wheel #3 motor current overload and momentum desaturation failure.',
      affectedComponent: 'reaction_wheel',
      recovery: 'Fire magnetic torquers to desaturate momentum and switch to 3-wheel control.',
    },
  };

  return (
    <Card className="bg-red-950/40 border-red-500/50 p-4 shadow-xl">
      <div className="flex items-center justify-between pb-2 border-b border-red-500/30">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
          <h4 className="text-xs font-bold text-red-200 uppercase tracking-wider">Active Fault Diagnostics Overlay</h4>
        </div>
        <Badge variant="danger" className="text-[10px]">
          {activeFaults.length} FAULT(S) INJECTED
        </Badge>
      </div>

      <div className="mt-3 space-y-3">
        {activeFaults.map((faultKey) => {
          const meta = faultMetadata[faultKey] || {
            name: faultKey.replace(/_/g, ' '),
            subsystem: 'Spacecraft System',
            severity: 'HIGH' as const,
            description: 'Subsystem anomaly detected via backend telemetry stream.',
            affectedComponent: 'battery' as SubsystemComponentId,
            recovery: 'Standard recovery procedure recommended.',
          };

          const isHighlighted = selectedComponent === meta.affectedComponent;

          return (
            <div
              key={faultKey}
              className={`p-3 rounded-lg border transition-all ${
                isHighlighted
                  ? 'bg-red-900/60 border-red-400 ring-2 ring-red-500/50'
                  : 'bg-red-950/60 border-red-500/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-red-200">{meta.name}</span>
                <Badge variant={meta.severity === 'CRITICAL' ? 'danger' : 'warning'} className="text-[9px]">
                  {meta.severity}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-red-300/80 mb-2">
                <div>Subsystem: <span className="font-semibold text-slate-200">{meta.subsystem}</span></div>
                <div>Affected Mesh: <span className="font-semibold uppercase text-cyan-300">{meta.affectedComponent}</span></div>
              </div>

              <p className="text-[11px] text-slate-300 leading-snug mb-2">{meta.description}</p>

              <div className="p-2 rounded bg-slate-950/80 border border-slate-800 flex items-start gap-1.5 text-[10px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300">Recovery Status: </span>
                  {meta.recovery}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
