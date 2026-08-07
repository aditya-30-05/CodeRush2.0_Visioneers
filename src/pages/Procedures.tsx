import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { CheckSquare, Square, Clock, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const procedures = [
  {
    id: "proc-th-002",
    code: "PROC-TH-002",
    name: "Emergency Thermal Recovery",
    riskLevel: "high" as const,
    estimatedDuration: "31 min",
    subsystem: "Thermal Control",
    steps: [
      { id: "s1", step: 1, description: "Switch primary coolant loop to secondary circuit", time: "2 min" },
      { id: "s2", step: 2, description: "Reduce imaging payload power draw by 30%", time: "1 min" },
      { id: "s3", step: 3, description: "Reorient spacecraft to shadowed attitude for 10 minutes", time: "10 min" },
      { id: "s4", step: 4, description: "Activate emergency radiator vane deployment", time: "3 min" },
      { id: "s5", step: 5, description: "Monitor temperature for stabilization — target < 33°C", time: "15 min" },
    ],
  },
  {
    id: "proc-batt-001",
    code: "PROC-BATT-001",
    name: "Battery Safe Mode Entry",
    riskLevel: "medium" as const,
    estimatedDuration: "18 min",
    subsystem: "Battery",
    steps: [
      { id: "s1", step: 1, description: "Disable non-essential payload systems", time: "2 min" },
      { id: "s2", step: 2, description: "Switch to minimum power configuration", time: "3 min" },
      { id: "s3", step: 3, description: "Monitor cell voltages — target > 3.6V per cell", time: "10 min" },
      { id: "s4", step: 4, description: "Assess solar charge rate and project recovery time", time: "3 min" },
    ],
  },
  {
    id: "proc-comms-003",
    code: "PROC-COMMS-003",
    name: "Communication Link Recovery",
    riskLevel: "low" as const,
    estimatedDuration: "12 min",
    subsystem: "Communication",
    steps: [
      { id: "s1", step: 1, description: "Rotate antenna to best-guess pointing based on ephemeris", time: "3 min" },
      { id: "s2", step: 2, description: "Switch to backup transmitter", time: "2 min" },
      { id: "s3", step: 3, description: "Broadcast beacon on emergency frequency", time: "5 min" },
      { id: "s4", step: 4, description: "Confirm signal acquisition with ground station", time: "2 min" },
    ],
  },
];

const riskConfig = {
  low: { badge: "success" as const, bar: "bg-green-500" },
  medium: { badge: "warning" as const, bar: "bg-amber-500" },
  high: { badge: "danger" as const, bar: "bg-red-500" },
  critical: { badge: "danger" as const, bar: "bg-red-500" },
};

export function Procedures() {
  const [expanded, setExpanded] = useState<string>("proc-th-002");
  const [completedSteps, setCompletedSteps] = useState<Record<string, string[]>>({});

  const toggleStep = (procId: string, stepId: string) => {
    setCompletedSteps(prev => {
      const curr = prev[procId] || [];
      return {
        ...prev,
        [procId]: curr.includes(stepId) ? curr.filter(s => s !== stepId) : [...curr, stepId],
      };
    });
  };

  return (
    <DashboardLayout title="Procedures">
      <div className="max-w-[1440px] space-y-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">{procedures.length} procedures available</p>
        </div>

        {procedures.map((proc, i) => {
          const steps = completedSteps[proc.id] || [];
          const pct = Math.round((steps.length / proc.steps.length) * 100);
          const isOpen = expanded === proc.id;

          return (
            <motion.div
              key={proc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={cn("transition-all", isOpen && "border-primary/30")}>
                {/* Header */}
                <button
                  className="w-full"
                  onClick={() => setExpanded(isOpen ? "" : proc.id)}
                >
                  <CardHeader className="cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-primary shrink-0" />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-foreground">{proc.name}</p>
                          <p className="text-xs text-muted-foreground mono">{proc.code} · {proc.subsystem}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={riskConfig[proc.riskLevel].badge}>{proc.riskLevel} risk</Badge>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">{proc.estimatedDuration}</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{pct}%</span>
                        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                    <Progress
                      value={pct}
                      className="h-1 mt-2"
                      indicatorClassName={riskConfig[proc.riskLevel].bar}
                    />
                  </CardHeader>
                </button>

                {/* Steps */}
                {isOpen && (
                  <CardContent className="pt-0 space-y-2 border-t border-border">
                    <div className="pt-4 space-y-1.5">
                      {proc.steps.map(step => {
                        const done = steps.includes(step.id);
                        return (
                          <motion.button
                            key={step.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onClick={() => toggleStep(proc.id, step.id)}
                            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
                          >
                            {done ? (
                              <CheckSquare className="h-4 w-4 text-success shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-border shrink-0" />
                            )}
                            <span className={cn("flex-1 text-xs font-medium", done && "line-through text-muted-foreground")}>
                              <span className="mono text-muted-foreground mr-2">{String(step.step).padStart(2, "0")}.</span>
                              {step.description}
                            </span>
                            <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                              <Clock className="h-3 w-3" />
                              <span className="text-[10px]">{step.time}</span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button variant="default" size="sm" className="flex-1" id={`proc-approve-${proc.id}`}>Approve & Execute</Button>
                      <Button variant="outline" size="sm" id={`proc-preview-${proc.id}`}>Preview</Button>
                      <Button variant="destructive" size="sm" id={`proc-reject-${proc.id}`}>Reject</Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
