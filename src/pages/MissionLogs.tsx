import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Cpu, User } from "lucide-react";
import { useMission } from "@/context/MissionContext";
import { missionEvents as fallbackEvents } from "@/data/missionData";

const typeConfig = {
  milestone: { icon: CheckCircle2, iconClass: "text-primary", badge: "info" as const, bg: "bg-blue-50/50" },
  system: { icon: Cpu, iconClass: "text-success", badge: "success" as const, bg: "bg-green-50/50" },
  operator: { icon: User, iconClass: "text-purple-600", badge: "default" as const, bg: "bg-purple-50/50" },
  anomaly: { icon: AlertTriangle, iconClass: "text-danger", badge: "danger" as const, bg: "bg-red-50/50" },
};

export function MissionLogs() {
  const { replayEvents, fetchReplayEvents, missionId } = useMission();
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchReplayEvents(missionId || undefined);
  }, [missionId]);

  const activeEvents = (replayEvents && replayEvents.length > 0) ? replayEvents : fallbackEvents;

  const counts = {
    total: activeEvents.length,
    milestone: activeEvents.filter(e => e.type === "milestone").length,
    anomaly: activeEvents.filter(e => e.type === "anomaly").length,
    operator: activeEvents.filter(e => e.type === "operator").length,
  };

  const filtered = filter === "all" ? activeEvents : activeEvents.filter(e => e.type === filter);

  return (
    <DashboardLayout title="Mission Logs">
      <div className="max-w-[1440px] space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Events", value: counts.total, variant: "secondary" as const, cat: "all" },
            { label: "Milestones", value: counts.milestone, variant: "info" as const, cat: "milestone" },
            { label: "Anomalies", value: counts.anomaly, variant: "danger" as const, cat: "anomaly" },
            { label: "Operator Actions", value: counts.operator, variant: "default" as const, cat: "operator" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              onClick={() => setFilter(s.cat)}
              className="cursor-pointer"
            >
              <Card className={cn(filter === s.cat && "border-primary/50 bg-primary/5")}>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-2xl font-bold mono text-foreground">{s.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Log table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Historical Mission Event Log (Supabase / Memory)</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {missionId ? `Mission #${missionId.slice(0, 8)}` : "Live Simulation"}
                </Badge>
                {(["all", "milestone", "system", "operator", "anomaly"] as const).map(catType => (
                  <button
                    key={catType}
                    onClick={() => setFilter(catType)}
                    className={cn(
                      "text-[11px] font-medium px-2.5 py-1 rounded-md capitalize transition-colors",
                      filter === catType ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {catType}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-border bg-muted/40">
              {["MET", "UTC Time", "Type", "Subsystem", "Description"].map((h, i) => (
                <p key={i} className={cn("text-[10px] font-semibold uppercase tracking-wide text-muted-foreground", i === 4 ? "col-span-5" : i === 0 ? "col-span-2" : "col-span-2")}>
                  {h}
                </p>
              ))}
            </div>
            <ScrollArea className="h-[520px]">
              <div>
                {filtered.map((evt, i) => {
                  const cfg = typeConfig[evt.type] ?? typeConfig.system;
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={evt.id || i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className={cn(
                        "grid grid-cols-12 gap-3 px-5 py-3.5 items-start border-b border-border/50 hover:bg-muted/30 transition-colors",
                        i % 2 === 0 ? "bg-white" : "bg-muted/10"
                      )}
                    >
                      <p className="col-span-2 text-xs font-mono text-foreground">{evt.met}</p>
                      <p className="col-span-2 text-xs font-mono text-muted-foreground">{evt.time}</p>
                      <div className="col-span-2 flex items-center gap-1.5">
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", cfg.iconClass)} />
                        <Badge variant={cfg.badge} className="text-[10px]">{evt.type}</Badge>
                      </div>
                      <p className="col-span-1 text-xs text-muted-foreground truncate">{evt.subsystem || "—"}</p>
                      <p className="col-span-5 text-xs text-foreground leading-relaxed">{evt.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
