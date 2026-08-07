import { DashboardLayout } from "@/layouts/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { MissionTimeline } from "@/components/dashboard/MissionTimeline";
import { TelemetryCharts } from "@/components/dashboard/TelemetryCharts";
import { LiveAlerts } from "@/components/dashboard/LiveAlerts";
import { DigitalTwin } from "@/components/dashboard/DigitalTwin";
import { MissionIntelligence } from "@/components/dashboard/MissionIntelligence";
import { RecoveryProcedure } from "@/components/dashboard/RecoveryProcedure";
import { FaultInjection } from "@/components/dashboard/FaultInjection";
import { ReplayTimeline } from "@/components/dashboard/ReplayTimeline";
import { MissionBanner } from "@/components/dashboard/MissionBanner";
import { Separator } from "@/components/ui/separator";
import { useMission } from "@/context/MissionContext";
import type { MissionMetric } from "@/types/mission";

export function Dashboard() {
  const { telemetry } = useMission();

  const liveMetrics: MissionMetric[] = [
    {
      id: "battery",
      label: "Battery",
      value: telemetry ? Math.round(telemetry.battery) : 95,
      unit: "%",
      trend: telemetry?.batteryCharging ? "up" : "down",
      trendValue: 1.2,
      status: !telemetry ? "nominal" : telemetry.battery < 25 ? "critical" : telemetry.battery < 50 ? "warning" : "nominal",
      min: 0,
      max: 100,
    },
    {
      id: "temperature",
      label: "Temperature",
      value: telemetry ? Math.round(telemetry.temperature) : 22,
      unit: "°C",
      trend: telemetry && telemetry.temperature > 40 ? "up" : "down",
      trendValue: 2.5,
      status: !telemetry ? "nominal" : telemetry.temperature > 60 ? "critical" : telemetry.temperature > 45 ? "warning" : "nominal",
      min: -20,
      max: 80,
    },
    {
      id: "power",
      label: "Power Output",
      value: telemetry ? Math.round(telemetry.solarGeneration || telemetry.powerGeneration || 420) : 420,
      unit: "W",
      trend: "up",
      trendValue: 0.8,
      status: !telemetry ? "nominal" : telemetry.solarGeneration === 0 ? "warning" : "nominal",
      min: 0,
      max: 600,
    },
    {
      id: "storage",
      label: "Storage Used",
      value: telemetry ? Math.round(telemetry.storagePct) : 12,
      unit: "%",
      trend: "up",
      trendValue: 0.5,
      status: !telemetry ? "nominal" : telemetry.storagePct > 90 ? "critical" : telemetry.storagePct > 75 ? "warning" : "nominal",
      min: 0,
      max: 100,
    },
    {
      id: "signal",
      label: "Signal Strength",
      value: telemetry ? Math.round(telemetry.signalStrength) : 92,
      unit: "dBm",
      trend: telemetry?.windowOpen ? "up" : "down",
      trendValue: 1.1,
      status: !telemetry ? "nominal" : telemetry.signalStrength < 40 ? "critical" : telemetry.signalStrength < 70 ? "warning" : "nominal",
      min: 0,
      max: 100,
    },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6 max-w-[1440px]">

        {/* Mission Banner */}
        <MissionBanner />

        {/* Row 1 — Metric Cards */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Spacecraft Status
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {liveMetrics.map((metric, i) => (
              <MetricCard key={metric.id} metric={metric} index={i} />
            ))}
          </div>
        </section>

        <Separator />

        {/* Row 2 — Mission Timeline */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Mission Progress
          </h2>
          <MissionTimeline />
        </section>

        <Separator />

        {/* Row 3 — Telemetry Charts */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Telemetry Analysis
          </h2>
          <TelemetryCharts />
        </section>

        <Separator />

        {/* Row 4 — Alerts + Digital Twin */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Systems Monitor
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <LiveAlerts />
            <DigitalTwin />
          </div>
        </section>

        <Separator />

        {/* Row 5 — Intelligence + Recovery */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Anomaly Detection & Recovery
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <MissionIntelligence />
            <RecoveryProcedure />
          </div>
        </section>

        <Separator />

        {/* Row 6 — Fault Injection + Replay */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Simulation Controls
          </h2>
          <div className="grid grid-cols-2 gap-5">
            <FaultInjection />
            <ReplayTimeline />
          </div>
        </section>

      </div>
    </DashboardLayout>
  );
}
