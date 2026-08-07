import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { alertsData } from "@/data/missionData";
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
            <Badge variant="danger">
              {alertsData.filter((a) => !a.resolved).length} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-[340px]">
            <div className="px-5 pb-4 space-y-2">
              {alertsData.map((alert, i) => {
                const config = severityConfig[alert.severity];
                const Icon = config.icon;
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "flex gap-3 rounded-lg p-3 border",
                      alert.severity === "critical" ? "border-red-100 bg-red-50/50" :
                      alert.severity === "warning" ? "border-amber-100 bg-amber-50/50" :
                      alert.severity === "resolved" ? "border-green-100 bg-green-50/50" :
                      "border-blue-100 bg-blue-50/50"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.iconClass)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={config.badge}>{config.label}</Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">{alert.timestamp}</span>
                      </div>
                      <p className="text-xs font-medium text-foreground">{alert.subsystem}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.description}</p>
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
