import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { subsystemsData } from "@/data/missionData";
import type { SubsystemStatus } from "@/types/mission";

const statusBadge: Record<SubsystemStatus, "success" | "warning" | "danger" | "secondary"> = {
  nominal: "success",
  degraded: "warning",
  critical: "danger",
  offline: "secondary",
};

const healthBarColor: Record<SubsystemStatus, string> = {
  nominal: "bg-green-500",
  degraded: "bg-amber-500",
  critical: "bg-red-500",
  offline: "bg-gray-400",
};

export function DigitalTwin() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="flex flex-col h-full"
    >
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Digital Twin</CardTitle>
            <Badge variant="success">7 Subsystems</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          {subsystemsData.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3"
            >
              {/* Health indicator dot */}
              <div
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  sub.status === "nominal" ? "bg-green-500" :
                  sub.status === "degraded" ? "bg-amber-500 animate-pulse" :
                  sub.status === "critical" ? "bg-red-500 animate-pulse" :
                  "bg-gray-400"
                )}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-foreground">{sub.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusBadge[sub.status]} className="text-[10px] py-0">
                      {sub.status}
                    </Badge>
                    <span className="text-[10px] font-mono text-muted-foreground mono">
                      {sub.health}%
                    </span>
                  </div>
                </div>
                <Progress
                  value={sub.health}
                  className="h-1"
                  indicatorClassName={healthBarColor[sub.status]}
                />
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
