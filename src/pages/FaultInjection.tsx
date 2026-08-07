import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMission } from "@/context/MissionContext";

const faults = [
  { id: "SOLAR_PANEL_FAILURE", label: "Solar Panel Failure", severity: "critical", subsystem: "Power", description: "Simulates complete solar array power loss. Battery drain begins immediately." },
  { id: "BATTERY_LEAK", label: "Battery Cell Leak", severity: "critical", subsystem: "Power", description: "Simulates electrolyte leakage causing capacity reduction and thermal event." },
  { id: "THERMAL_SPIKE", label: "Thermal Spike", severity: "warning", subsystem: "Thermal", description: "Injects +5°C/tick thermal anomaly in secondary cooling loop." },
  { id: "SENSOR_DRIFT", label: "Sensor Drift", severity: "warning", subsystem: "Sensors", description: "Applies ±5% Gaussian noise drift to attitude determination sensors." },
  { id: "COMMUNICATION_LOSS", label: "Communication Loss", severity: "critical", subsystem: "Communication", description: "Drops uplink/downlink — spacecraft enters safe mode after timeout." },
  { id: "PACKET_LOSS", label: "Packet Loss", severity: "warning", subsystem: "Communication", description: "Simulates 20-80% random packet loss on downlink channel." },
  { id: "REACTION_WHEEL_FAILURE", label: "Reaction Wheel Failure", severity: "critical", subsystem: "ADCS", description: "Disables reaction wheel, causing attitude drift and tumbling mode." },
  { id: "ACTUATOR_FAILURE", label: "Actuator Failure", severity: "warning", subsystem: "Instruments", description: "Disables camera and antenna tracking actuators." },
  { id: "CONFLICTING_SENSORS", label: "Conflicting Sensors", severity: "warning", subsystem: "Sensors", description: "Multiple sensors report contradictory values — data flagged unreliable." },
  { id: "MISSING_TELEMETRY", label: "Missing Telemetry", severity: "info", subsystem: "Telemetry", description: "Random telemetry frames are dropped, causing monitoring gaps." },
];

export function FaultInjectionPage() {
  const { activeFaults, injectFault, clearFault, missionStatus } = useMission();
  const [log, setLog] = useState<{ id: string; label: string; time: string; action: "injected" | "cleared"; duration?: number | null }[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<Record<string, number | null>>({});
  const isRunning = missionStatus === "RUNNING";

  const durations = [
    { label: "Permanent", value: null },
    { label: "30s", value: 30 },
    { label: "60s", value: 60 },
    { label: "120s", value: 120 },
  ];

  const toggle = (fault: typeof faults[0]) => {
    const time = new Date().toLocaleTimeString();
    if (activeFaults.includes(fault.id)) {
      clearFault(fault.id);
      setLog(p => [{ id: fault.id, label: fault.label, time, action: "cleared" as const }, ...p].slice(0, 30));
    } else {
      const dur = selectedDuration[fault.id] ?? null;
      injectFault(fault.id, dur ? { duration: dur } : undefined);
      setLog(p => [{ id: fault.id, label: fault.label, time, action: "injected" as const, duration: dur }, ...p].slice(0, 30));
    }
  };

  return (
    <DashboardLayout title="Fault Injection">
      <div className="space-y-6 max-w-[1440px]">
        {/* Status banner */}
        <AnimatePresence>
          {activeFaults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3"
            >
              <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
              <p className="text-sm font-medium text-danger">
                {activeFaults.length} fault{activeFaults.length > 1 ? "s" : ""} actively injected into simulation
              </p>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => { activeFaults.forEach(f => clearFault(f)); setLog(p => [{ id: "all", label: "All Faults", time: new Date().toLocaleTimeString(), action: "cleared" as const }, ...p]); }}
              >
                Clear All
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-5">
          {/* Fault list */}
          <div className="col-span-2 space-y-3">
            {faults.map((fault, i) => {
              const isActive = activeFaults.includes(fault.id);
              return (
                <motion.div
                  key={fault.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                >
                  <Card className={cn("transition-all", isActive && "border-red-200 bg-red-50/30")}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {isActive ? (
                              <AlertTriangle className="h-4 w-4 text-danger animate-pulse shrink-0" />
                            ) : (
                              <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <p className="text-sm font-semibold text-foreground">{fault.label}</p>
                            <Badge variant={fault.severity === "critical" ? "danger" : fault.severity === "info" ? "info" : "warning"}>{fault.severity}</Badge>
                            {isActive && <Badge variant="danger">ACTIVE</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">{fault.subsystem}</p>
                          <p className="text-xs text-muted-foreground ml-6 mt-1 leading-relaxed">{fault.description}</p>
                        </div>
                        <div className="flex flex-col gap-2 items-end shrink-0">
                          {!isActive && (
                            <div className="flex gap-1">
                              {durations.map(d => (
                                <button
                                  key={d.label}
                                  onClick={() => setSelectedDuration(prev => ({ ...prev, [fault.id]: d.value }))}
                                  className={cn(
                                    "text-[10px] px-2 py-0.5 rounded border transition-colors",
                                    (selectedDuration[fault.id] ?? null) === d.value
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                                  )}
                                >
                                  {d.label}
                                </button>
                              ))}
                            </div>
                          )}
                          <Button
                            variant={isActive ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => toggle(fault)}
                            disabled={!isRunning}
                            id={`fault-btn-${fault.id}`}
                            className="shrink-0 min-w-[80px]"
                          >
                            {isActive ? "Clear" : "Inject"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Injection log */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Injection Log</CardTitle>
                  <Badge variant="secondary">{log.length} events</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                {log.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No faults injected yet</p>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {log.map((entry) => (
                        <motion.div
                          key={`${entry.id}-${entry.time}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50"
                        >
                          {entry.action === "injected" ? (
                            <XCircle className="h-3.5 w-3.5 text-danger mt-0.5 shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-medium text-foreground">{entry.label}</p>
                            <p className="text-[10px] text-muted-foreground mono">{entry.time} — {entry.action}</p>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
