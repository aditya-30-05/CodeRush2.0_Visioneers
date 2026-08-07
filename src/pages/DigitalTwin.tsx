import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { subsystemsData } from "@/data/missionData";
import { cn } from "@/lib/utils";
import type { SubsystemStatus } from "@/types/mission";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip
} from "recharts";

const statusBadge: Record<SubsystemStatus, "success" | "warning" | "danger" | "secondary"> = {
  nominal: "success",
  degraded: "warning",
  critical: "danger",
  offline: "secondary",
};

const radarData = subsystemsData.map(s => ({ subject: s.name.replace(" Pack", "").replace(" Control", "").replace(" Panels", ""), health: s.health }));

export function DigitalTwinPage() {
  return (
    <DashboardLayout title="Digital Twin">
      <div className="space-y-6 max-w-[1440px]">

        {/* Radar chart + subsystem list */}
        <div className="grid grid-cols-3 gap-5">
          {/* Radar */}
          <Card>
            <CardHeader><CardTitle>System Health Radar</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#E5E7EB" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#6B7280" }} />
                    <Radar name="Health" dataKey="health" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} strokeWidth={2} />
                    <Tooltip contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Subsystem list */}
          <div className="col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Subsystem Health</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="success">{subsystemsData.filter(s => s.status === "nominal").length} Nominal</Badge>
                    <Badge variant="warning">{subsystemsData.filter(s => s.status === "degraded").length} Degraded</Badge>
                    <Badge variant="danger">{subsystemsData.filter(s => s.status === "critical").length} Critical</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 pt-4">
                {subsystemsData.map((sub, i) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.07 }}
                    className={cn(
                      "rounded-xl border p-4",
                      sub.status === "critical" ? "border-red-200 bg-red-50/40" :
                      sub.status === "degraded" ? "border-amber-200 bg-amber-50/40" :
                      "border-border"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-foreground">{sub.name}</p>
                      <Badge variant={statusBadge[sub.status]}>{sub.status}</Badge>
                    </div>
                    <div className="flex items-end gap-1 mb-2">
                      <span className="text-2xl font-bold mono text-foreground">{sub.health}</span>
                      <span className="text-xs text-muted-foreground mb-0.5">%</span>
                    </div>
                    <Progress
                      value={sub.health}
                      className="h-1.5"
                      indicatorClassName={
                        sub.status === "critical" ? "bg-red-500" :
                        sub.status === "degraded" ? "bg-amber-500" : "bg-green-500"
                      }
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5">Last update: {sub.lastUpdate}</p>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
