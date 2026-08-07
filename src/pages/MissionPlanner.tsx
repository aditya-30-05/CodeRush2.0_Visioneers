import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { missionPhases, missionObjectives, missionConfig } from "@/data/missionData";
import { CheckCircle2, Circle, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";

export function MissionPlanner() {
  return (
    <DashboardLayout title="Mission Planner">
      <div className="space-y-6 max-w-[1440px]">

        {/* Mission Overview */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Mission ID", value: missionConfig.name, mono: true },
            { label: "Success Probability", value: `${missionConfig.successProbability}%`, mono: true },
            { label: "Current Phase", value: missionConfig.phase, mono: false },
            { label: "MET", value: missionConfig.met, mono: true },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className={cn("text-lg font-bold text-foreground", item.mono && "mono")}>{item.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-5">
          {/* Phase Timeline */}
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Mission Phase Plan</CardTitle>
                  <Badge variant="info">8 Phases</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {missionPhases.map((phase, i) => (
                    <motion.div
                      key={phase.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border",
                        phase.status === "active" ? "border-primary/30 bg-primary/5" : "border-border"
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-border">
                        {phase.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : phase.status === "active" ? (
                          <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                        ) : (
                          <Circle className="h-4 w-4 text-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={cn("text-sm font-medium", phase.status === "active" ? "text-primary" : "text-foreground")}>
                            {phase.name}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground mono">{phase.startTime} → {phase.endTime}</span>
                            <Badge
                              variant={phase.status === "completed" ? "success" : phase.status === "active" ? "info" : "secondary"}
                            >
                              {phase.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Progress
                            value={phase.completionPct}
                            className="flex-1 h-1.5"
                            indicatorClassName={phase.status === "completed" ? "bg-green-500" : "bg-primary"}
                          />
                          <span className="text-[10px] font-mono text-muted-foreground w-8">{phase.completionPct}%</span>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span className="text-[10px]">{phase.duration}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Objectives */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <CardTitle>Objectives</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                {missionObjectives.map((obj) => (
                  <div key={obj.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-medium text-foreground">{obj.name}</p>
                      <Badge variant={obj.status === "completed" ? "success" : "info"}>
                        {obj.status}
                      </Badge>
                    </div>
                    <Progress
                      value={(obj.progress / obj.target) * 100}
                      className="h-1.5 mb-1"
                      indicatorClassName={obj.status === "completed" ? "bg-green-500" : "bg-primary"}
                    />
                    <p className="text-[10px] font-mono text-muted-foreground text-right">
                      {obj.progress} / {obj.target} {obj.unit}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
