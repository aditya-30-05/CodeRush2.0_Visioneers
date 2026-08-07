import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { missionEvents } from "@/data/missionData";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Cpu, User } from "lucide-react";

const typeConfig = {
  milestone: { icon: CheckCircle2, iconClass: "text-primary", badge: "info" as const, bg: "bg-blue-50/50" },
  system: { icon: Cpu, iconClass: "text-success", badge: "success" as const, bg: "bg-green-50/50" },
  operator: { icon: User, iconClass: "text-purple-600", badge: "default" as const, bg: "bg-purple-50/50" },
  anomaly: { icon: AlertTriangle, iconClass: "text-danger", badge: "danger" as const, bg: "bg-red-50/50" },
};

export function MissionLogs() {
  const counts = {
    total: missionEvents.length,
    milestone: missionEvents.filter(e => e.type === "milestone").length,
    anomaly: missionEvents.filter(e => e.type === "anomaly").length,
    operator: missionEvents.filter(e => e.type === "operator").length,
  };

  return (
    <DashboardLayout title="Mission Logs">
      <div className="max-w-[1440px] space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Events", value: counts.total, variant: "secondary" as const },
            { label: "Milestones", value: counts.milestone, variant: "info" as const },
            { label: "Anomalies", value: counts.anomaly, variant: "danger" as const },
            { label: "Operator Actions", value: counts.operator, variant: "default" as const },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card>
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
              <CardTitle>Event Log</CardTitle>
              <Badge variant="secondary">ISRO-SAT-4B · Session #12</Badge>
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
                {missionEvents.map((evt, i) => {
                  const cfg = typeConfig[evt.type];
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
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
