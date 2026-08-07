import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { missionPhases, missionObjectives, missionConfig } from "@/data/missionData";
import { useMission } from "@/context/MissionContext";

export function MissionTimeline() {
  const { telemetry, missionStatus } = useMission();
  
  // Calculate dynamic progress if running
  const progress = missionStatus === "RUNNING" || missionStatus === "PAUSED" 
    ? Math.min(100, Math.floor(((telemetry?.missionTime || 0) / 600) * 100)) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="grid grid-cols-3 gap-5"
    >
      {/* Timeline */}
      <div className="col-span-2">
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Mission Timeline</CardTitle>
              <Badge variant="info">Phase 5 of 8</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {/* Overall progress */}
            <div className="mb-5">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Overall Mission Progress</span>
                <span className="font-mono font-medium text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Phase list */}
            <div className="relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-3">
                {missionPhases.map((phase) => (
                  <div key={phase.id} className="relative flex items-start gap-4 pl-8">
                    {/* Phase dot */}
                    <div className="absolute left-2 top-1">
                      {phase.status === "completed" ? (
                        <CheckCircle2 className="h-3 w-3 text-success" />
                      ) : phase.status === "active" ? (
                        <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <Circle className="h-3 w-3 text-border" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-2">
                          <p
                            className={cn(
                              "text-xs font-medium",
                              phase.status === "active" ? "text-primary" :
                              phase.status === "completed" ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {phase.name}
                          </p>
                          {phase.status === "active" && (
                            <Badge variant="info" className="text-[10px] py-0">Active</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span className="text-[10px]">{phase.duration}</span>
                        </div>
                      </div>

                      {phase.status !== "upcoming" && (
                        <Progress
                          value={phase.completionPct}
                          className="h-1"
                          indicatorClassName={phase.status === "completed" ? "bg-green-500" : "bg-primary"}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Objectives */}
      <div>
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Mission Objectives</CardTitle>
              <Badge variant="success" className="mono">{missionConfig.successProbability}%</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Success Probability</p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {missionObjectives.map((obj) => (
              <div key={obj.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-foreground">{obj.name}</p>
                  <span className="text-xs font-mono text-muted-foreground">
                    {obj.progress}/{obj.target} {obj.unit}
                  </span>
                </div>
                <Progress
                  value={(obj.progress / obj.target) * 100}
                  className="h-1.5"
                  indicatorClassName={obj.status === "completed" ? "bg-green-500" : "bg-primary"}
                />
              </div>
            ))}

            <div className="mt-4 rounded-lg bg-muted/50 p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Remaining Tasks
              </p>
              <p className="text-xl font-bold text-foreground mono">
                {missionObjectives.filter(o => o.status !== "completed").length}
              </p>
              <p className="text-xs text-muted-foreground">of {missionObjectives.length} objectives</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
