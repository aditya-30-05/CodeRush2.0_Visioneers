import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMission } from "@/context/MissionContext";
import type { LiveWarning } from "@/hooks/useMissionSocket";
import type { AlertSeverity } from "@/types/mission";

const severityConfig: Record<AlertSeverity, {
  icon: React.ElementType;
  iconClass: string;
  badge: "danger" | "warning" | "info" | "success";
  label: string;
}> = {
  critical: { icon: AlertCircle, iconClass: "text-danger", badge: "danger", label: "Critical" },
  warning: { icon: AlertTriangle, iconClass: "text-warning", badge: "warning", label: "Warning" },
  info: { icon: Info, iconClass: "text-primary", badge: "info", label: "Info" },
  resolved: { icon: CheckCircle2, iconClass: "text-success", badge: "success", label: "Resolved" },
};

export function LiveAlerts() {
  const { warnings, missionStatus } = useMission();
  const activeCount = warnings ? warnings.filter((w: LiveWarning) => w.severity !== "resolved").length : 0;
  const isRunning = missionStatus === "RUNNING";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="flex flex-col h-full"
    >
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Live Alerts</CardTitle>
            <Badge variant={activeCount > 0 ? "danger" : "success"}>
              {isRunning ? `${activeCount} Active` : "No Mission"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[340px]">
            <div className="px-5 pb-4 space-y-2">
              {!isRunning && (!warnings || warnings.length === 0) && (
                <div className="flex items-center justify-center h-[280px]">
                  <p className="text-xs text-muted-foreground">Start a mission to see live alerts</p>
                </div>
              )}
              {warnings && warnings.map((warning: LiveWarning, i: number) => {
                const config = severityConfig[warning.severity] ?? severityConfig.info;
                const Icon = config.icon;
                const timeStr = `T+${Math.floor(warning.missionTime / 60)}:${String(Math.floor(warning.missionTime % 60)).padStart(2, "0")}`;
                return (
                  <motion.div
                    key={warning.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3) }}
                    className={cn(
                      "flex gap-3 rounded-lg p-3 border",
                      warning.severity === "critical" ? "border-red-100 bg-red-50/50" :
                      warning.severity === "warning" ? "border-amber-100 bg-amber-50/50" :
                      warning.severity === "resolved" ? "border-green-100 bg-green-50/50" :
                      "border-blue-100 bg-blue-50/50"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.iconClass)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={config.badge}>{config.label}</Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">{timeStr}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{warning.message}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
