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
import { dashboardMetrics } from "@/data/missionData";
import { Separator } from "@/components/ui/separator";

export function Dashboard() {
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
            {dashboardMetrics.map((metric, i) => (
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
