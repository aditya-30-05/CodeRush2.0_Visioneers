import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  Brain, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Battery, 
  Fuel, 
  Clock, 
  Target, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  Layers, 
  Activity,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  task_id: string;
  name: string;
  priority: number;
  duration_minutes: number;
  subsystem: string;
  dependencies: string[];
  status: string;
  start_time_offset_min: number;
  battery_required: number;
  fuel_required: number;
  description: string;
  is_corrective: boolean;
}

interface ConstraintCheck {
  name: string;
  value: number;
  threshold: string;
  status: string;
  message: string;
}

interface CorrectiveAction {
  fault_type: string;
  action_name: string;
  description: string;
  priority: number;
  subsystem: string;
  duration_minutes: number;
}

interface ResourceStatus {
  battery_available: number;
  battery_required: number;
  battery_remaining: number;
  fuel_available: number;
  fuel_required: number;
  fuel_remaining: number;
  has_shortage: boolean;
  task_estimates?: any[];
}

interface AiPlanReport {
  mission_name: string;
  objective: string;
  mission_type: string;
  destination: string;
  mission_status: string;
  /** API field: "feasibility" — GO | CAUTION | NO_GO */
  feasibility: string;
  /** Legacy alias kept for safety */
  feasibility_status?: string;
  risk_score: number;
  risk_level: string;
  abort_recommendation: boolean;
  abort_reason?: string;
  current_phase?: string;
  resource_status?: ResourceStatus;
  /** Legacy alias */
  resource_estimate?: {
    estimated_battery_remaining_pct: number;
    estimated_fuel_remaining_pct: number;
    has_shortage: boolean;
    shortage_details: string[];
  };
  constraint_results?: ConstraintCheck[];
  corrective_actions?: CorrectiveAction[];
  tasks?: Task[];
  explanation?: string;
}

export function MissionPlanner() {
  const [loading, setLoading] = useState(false);
  const [planReport, setPlanReport] = useState<AiPlanReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form Inputs
  const [missionName, setMissionName] = useState("OrbitOps Earth Observation");
  const [objective, setObjective] = useState("Orbital survey and multispectral land imaging");
  const [missionType, setMissionType] = useState("orbital_survey");
  const [destination, setDestination] = useState("LEO");
  const [durationHours, setDurationHours] = useState(24);

  const handleGeneratePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:4000/mission/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission_name: missionName,
          objective: objective,
          mission_type: missionType,
          destination: destination,
          duration_hours: durationHours,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setPlanReport(json.data);
      } else {
        setError(json.message || "Failed to generate AI mission plan.");
      }
    } catch (err: any) {
      setError(err.message || "Network error calling AI Mission Planner.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGeneratePlan();
  }, []);

  return (
    <DashboardLayout title="AI Mission Planner">
      <div className="space-y-6 max-w-[1440px]">

        {/* Top Header Card */}
        <Card className="bg-gradient-to-r from-background via-primary/5 to-background border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">Autonomous AI Space Mission Planner</h2>
                    <Badge variant="outline" className="border-primary/40 text-primary flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Deterministic Engine
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Decomposes objectives into dependency-aware tasks, evaluates constraint feasibility, forecasts power & fuel, and plans fault recovery rules.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleGeneratePlan}
                disabled={loading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                {loading ? "Planning Mission..." : "Generate AI Mission Plan"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mission Setup & Quick Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Mission Type</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={missionType}
                onChange={(e) => setMissionType(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="orbital_survey">Orbital Survey (LEO)</option>
                <option value="deep_space">Deep Space Exploration</option>
                <option value="sample_return">Sample Return</option>
                <option value="communication_relay">Communication Relay</option>
                <option value="maintenance">On-Orbit Servicing</option>
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Destination Orbit</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="LEO">LEO (Low Earth Orbit)</option>
                <option value="GEO">GEO (Geostationary Orbit)</option>
                <option value="Lunar Orbit">Lunar Orbit (EML-1)</option>
                <option value="Mars Transfer">Mars Transfer Orbit</option>
              </select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Planned Duration (Hours)</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <input
                type="number"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                min={1}
                max={168}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary mono"
              />
              <span className="text-xs text-muted-foreground">hrs</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">Objective Name</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="text"
                value={missionName}
                onChange={(e) => setMissionName(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </CardContent>
          </Card>
        </div>

        {/* AI Plan Executive Summary Cards */}
        {planReport && (() => {
          // Support both new field names (feasibility, resource_status) and legacy ones
          const feasibility = planReport.feasibility || planReport.feasibility_status || "GO";
          const batteryRemaining = planReport.resource_status?.battery_remaining
            ?? planReport.resource_estimate?.estimated_battery_remaining_pct
            ?? 0;
          const fuelRemaining = planReport.resource_status?.fuel_remaining
            ?? planReport.resource_estimate?.estimated_fuel_remaining_pct
            ?? 0;
          const hasShortage = planReport.resource_status?.has_shortage
            ?? planReport.resource_estimate?.has_shortage
            ?? false;
          const isGo = feasibility === "GO";
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Feasibility Decision</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={isGo ? "success" : feasibility === "CAUTION" ? "warning" : "danger"}
                        className="text-sm px-2.5 py-0.5"
                      >
                        {feasibility}
                      </Badge>
                      {planReport.abort_recommendation && (
                        <Badge variant="danger">ABORT REC</Badge>
                      )}
                    </div>
                    {planReport.current_phase && (
                      <p className="text-[10px] text-muted-foreground mt-1 mono">{planReport.current_phase}</p>
                    )}
                  </div>
                  <ShieldCheck className={cn("h-8 w-8", isGo ? "text-green-500" : "text-destructive")} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">AI Risk Score</p>
                    <p className="text-xl font-bold mono">{planReport.risk_score?.toFixed(1)} / 100</p>
                    <span className={cn(
                      "text-[10px] font-semibold uppercase",
                      planReport.risk_level === "LOW" ? "text-green-400" :
                      planReport.risk_level === "MEDIUM" ? "text-yellow-400" :
                      planReport.risk_level === "HIGH" ? "text-orange-400" : "text-red-400"
                    )}>
                      {planReport.risk_level} RISK
                    </span>
                  </div>
                  <AlertTriangle className={cn(
                    "h-8 w-8",
                    planReport.risk_level === "LOW" ? "text-green-500" :
                    planReport.risk_level === "MEDIUM" ? "text-yellow-500" : "text-red-500"
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Battery Forecast</p>
                    <p className={cn("text-xl font-bold mono", batteryRemaining < 20 ? "text-red-400" : "")}>
                      {batteryRemaining.toFixed(1)}%
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {hasShortage ? "⚠ Shortage Detected" : "Remaining at End"}
                    </span>
                  </div>
                  <Battery className={cn("h-8 w-8", batteryRemaining < 20 ? "text-red-400" : "text-primary")} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Fuel Forecast</p>
                    <p className={cn("text-xl font-bold mono", fuelRemaining < 10 ? "text-red-400" : "")}>
                      {fuelRemaining.toFixed(1)}%
                    </p>
                    <span className="text-[10px] text-muted-foreground">Propellant Reserve</span>
                  </div>
                  <Fuel className={cn("h-8 w-8", fuelRemaining < 10 ? "text-red-400" : "text-blue-400")} />
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Corrective Actions Banner (if active faults detected) */}
        {planReport?.corrective_actions && planReport.corrective_actions.length > 0 && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="h-5 w-5" />
                <CardTitle className="text-sm">Active Fault Recovery Rules Triggered</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {planReport.corrective_actions.map((act, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-background/60 border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                      {act.fault_type}
                    </Badge>
                    <span className="font-semibold text-foreground">{act.action_name}</span>
                    <span className="text-muted-foreground">{act.description}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground mono">
                    <Clock className="h-3 w-3" /> {act.duration_minutes}m
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Timeline & Task Breakdown (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Scheduled Task Timeline</CardTitle>
                  </div>
                  <Badge variant="info">{planReport?.tasks?.length || 0} Tasks</Badge>
                </div>
                <CardDescription className="text-xs">
                  Chronologically ordered tasks with dependency verification & resource allocation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {planReport?.tasks && planReport.tasks.length > 0 ? (
                    planReport.tasks.map((task, i) => (
                      <motion.div
                        key={task.task_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={cn(
                          "p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                          task.is_corrective
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-border bg-card hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mono shrink-0",
                            task.is_corrective ? "bg-amber-500/20 text-amber-400" : "bg-primary/10 text-primary"
                          )}>
                            T+{Math.floor(task.start_time_offset_min / 60)}h
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-foreground">{task.name}</p>
                              {task.is_corrective && (
                                <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-[10px] py-0">
                                  RECOVERY
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[10px] py-0">
                                {task.subsystem}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{task.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-muted-foreground shrink-0 self-end sm:self-center">
                          <div className="flex items-center gap-1 mono">
                            <Clock className="h-3 w-3 text-primary" /> {task.duration_minutes}m
                          </div>
                          <div className="flex items-center gap-1 mono">
                            <Zap className="h-3 w-3 text-yellow-400" /> -{task.battery_required}%
                          </div>
                          {task.fuel_required > 0 && (
                            <div className="flex items-center gap-1 mono">
                              <Fuel className="h-3 w-3 text-blue-400" /> -{task.fuel_required}%
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No tasks generated yet. Click "Generate AI Mission Plan".
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Constraint Checker Results */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Feasibility Constraint Verification</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {planReport?.constraint_results?.map((cr, idx) => (
                    <div key={idx} className="p-3 rounded-lg border border-border bg-background flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground capitalize">{cr.name.replace("_", " ")}</p>
                        <p className="text-[11px] text-muted-foreground">{cr.message}</p>
                      </div>
                      <Badge variant={cr.status === "PASS" ? "success" : cr.status === "WARNING" ? "warning" : "danger"}>
                        {cr.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Mission Explanation (1 col) */}
          <div className="space-y-6">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">AI Mission Explanation</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Synthesized mission plan explanation report
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                  {planReport?.explanation || "No explanation report generated."}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}
