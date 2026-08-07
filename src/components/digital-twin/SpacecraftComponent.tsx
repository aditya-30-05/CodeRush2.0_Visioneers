import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Thermometer, Radio, Disc, Camera, Sun, Activity, AlertTriangle } from 'lucide-react';
import type { SubsystemComponentId } from './Spacecraft3D';
import type { LiveTelemetry } from '@/hooks/useMissionSocket';

interface SpacecraftComponentProps {
  selectedComponent: SubsystemComponentId | null;
  telemetry: LiveTelemetry | null;
  activeFaults: string[];
}

export function SpacecraftComponent({ selectedComponent, telemetry, activeFaults }: SpacecraftComponentProps) {
  if (!selectedComponent) {
    return (
      <Card className="h-full bg-slate-900/60 border-slate-800/80 p-6 flex flex-col items-center justify-center text-center">
        <Activity className="w-10 h-10 text-cyan-400/50 mb-3 animate-pulse" />
        <h4 className="text-sm font-semibold text-slate-200">No Component Selected</h4>
        <p className="text-xs text-slate-400 max-w-[240px] mt-1">
          Click any component on the 3D spacecraft model or use the selector bar below to inspect detailed subsystem metrics.
        </p>
      </Card>
    );
  }

  const battery = telemetry?.battery ?? 100;
  const temp = telemetry?.temperature ?? 22;
  const solarGen = telemetry?.solarGeneration ?? 420;
  const signal = telemetry?.signalStrength ?? 92;
  const activity = telemetry?.activity || 'Observation';

  const componentConfigs: Record<SubsystemComponentId, {
    title: string;
    icon: React.ElementType;
    health: number;
    status: 'nominal' | 'degraded' | 'critical';
    metrics: { label: string; value: string }[];
    description: string;
  }> = {
    battery: {
      title: 'EPS Battery Storage Module',
      icon: Zap,
      health: Math.round(battery),
      status: battery < 30 ? 'critical' : battery < 70 ? 'degraded' : 'nominal',
      metrics: [
        { label: 'Charge Level', value: `${battery.toFixed(1)}%` },
        { label: 'Bus Voltage', value: `${(24.0 + (battery / 100) * 4.8).toFixed(2)} V` },
        { label: 'Charging Status', value: telemetry?.batteryCharging ? 'CHARGING' : 'DISCHARGING' },
        { label: 'Power Consumption', value: `${telemetry?.powerConsumption ?? 120} W` },
      ],
      description: 'LiFePO4 high-density energy storage providing power during orbital shadow passes.',
    },
    solar: {
      title: 'Photovoltaic Solar Panel Wings',
      icon: Sun,
      health: solarGen > 100 ? 98 : 45,
      status: solarGen > 200 ? 'nominal' : solarGen > 50 ? 'degraded' : 'critical',
      metrics: [
        { label: 'Solar Power Output', value: `${solarGen} W` },
        { label: 'Array Current', value: `${(solarGen / 28).toFixed(1)} A` },
        { label: 'Orientation Mode', value: telemetry?.orientation || 'SUN_POINTING' },
        { label: 'Efficiency Rating', value: '29.5% Triple Junction' },
      ],
      description: 'Dual-wing articulating photovoltaic arrays generating clean solar energy in sunlit orbit.',
    },
    antenna: {
      title: 'TT&C High-Gain Communication Dish',
      icon: Radio,
      health: Math.round(signal),
      status: signal > 75 ? 'nominal' : signal > 30 ? 'degraded' : 'critical',
      metrics: [
        { label: 'Signal Strength', value: `${signal.toFixed(1)}%` },
        { label: 'Packet Loss Rate', value: `${telemetry?.packetLoss ?? 0}%` },
        { label: 'Telemetry Latency', value: `${telemetry?.latencyMs ?? 220} ms` },
        { label: 'Ground Window', value: telemetry?.windowOpen ? 'IN RANGE (ISRO SHAR)' : 'OUT OF RANGE' },
      ],
      description: 'X-band dual-reflector antenna establishing high-throughput ground station links.',
    },
    thermal: {
      title: 'Thermal Control Radiators',
      icon: Thermometer,
      health: temp > 60 ? 35 : temp > 40 ? 75 : 98,
      status: temp > 60 ? 'critical' : temp > 45 ? 'degraded' : 'nominal',
      metrics: [
        { label: 'Core Temperature', value: `${temp.toFixed(1)} °C` },
        { label: 'Heat Dissipation', value: `${Math.round(temp * 4.2)} W` },
        { label: 'Heater Loop Status', value: temp < 10 ? 'HEATER ACTIVE' : 'NOMINAL' },
        { label: 'Coolant Flow', value: 'Passive Loop Active' },
      ],
      description: 'Louvred radiator plates and MLI insulation maintaining payload operating temperature.',
    },
    reaction_wheel: {
      title: 'ADCS Reaction Wheel Assembly',
      icon: Disc,
      health: activeFaults.some(f => f.includes('REACTION')) ? 40 : 96,
      status: activeFaults.some(f => f.includes('REACTION')) ? 'critical' : 'nominal',
      metrics: [
        { label: 'Wheel Speed (RPM)', value: '3,450 RPM' },
        { label: 'Momentum Vector', value: '[0.02, -0.14, 0.98]' },
        { label: 'Attitude Mode', value: telemetry?.orientation || 'EARTH_POINTING' },
        { label: 'Gyro Health', value: activeFaults.some(f => f.includes('REACTION')) ? 'FAULT DETECTED' : 'HEALTHY' },
      ],
      description: '4-wheel momentum management system providing high-precision 3-axis stabilization.',
    },
    payload: {
      title: 'Multispectral Camera Payload',
      icon: Camera,
      health: 100,
      status: 'nominal',
      metrics: [
        { label: 'Camera State', value: activity === 'Observation' ? 'IMAGING ACTIVE' : 'STANDBY' },
        { label: 'Ground Resolution', value: '0.8m / Pixel GSD' },
        { label: 'Storage Used', value: `${telemetry?.storagePct ?? 12}% (${telemetry?.storageUsedMB ?? 128} MB)` },
        { label: 'Spectral Bands', value: '4 RGB-NIR Channels' },
      ],
      description: 'High-resolution optical camera payload capturing multispectral earth observation data.',
    },
  };

  const current = componentConfigs[selectedComponent] || componentConfigs.battery;
  const Icon = current.icon;

  const relevantFaults = activeFaults.filter(f => f.toLowerCase().includes(selectedComponent));

  return (
    <Card className="h-full bg-slate-900/80 border-slate-800 p-5 flex flex-col justify-between shadow-xl">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-500/30 text-cyan-400">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{current.title}</h3>
              <p className="text-[11px] text-slate-400">Subsystem Inspection View</p>
            </div>
          </div>
          <Badge
            variant={
              current.status === 'critical' ? 'danger' :
              current.status === 'degraded' ? 'warning' : 'success'
            }
          >
            {current.status.toUpperCase()}
          </Badge>
        </div>

        {/* Health Progress */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Subsystem Health Index</span>
            <span className="font-mono font-bold text-slate-200">{current.health}%</span>
          </div>
          <Progress
            value={current.health}
            className="h-2 bg-slate-800"
            indicatorClassName={
              current.status === 'critical' ? 'bg-red-500' :
              current.status === 'degraded' ? 'bg-amber-500' : 'bg-emerald-500'
            }
          />
        </div>

        {/* Active Fault Alert Box */}
        {relevantFaults.length > 0 && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-950/60 border border-red-500/40 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-300">Active Fault Alert</p>
              <p className="text-[11px] text-red-400/90 leading-tight">
                {relevantFaults.join(', ')} is affecting component telemetry and hardware response.
              </p>
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {current.metrics.map((m, i) => (
            <div key={i} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{m.label}</p>
              <p className="text-xs font-mono font-semibold text-cyan-300 mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Description */}
      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 leading-normal">
        {current.description}
      </div>
    </Card>
  );
}
