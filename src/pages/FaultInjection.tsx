import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const faults = [
  { id: "solar-failure", label: "Solar Panel Failure", severity: "critical", subsystem: "Solar Panel", description: "Simulates complete solar array power loss. Battery drain begins immediately." },
  { id: "battery-leak", label: "Battery Cell Leak", severity: "critical", subsystem: "Battery", description: "Simulates electrolyte leakage causing capacity reduction and thermal event." },
  { id: "thermal-spike", label: "Thermal Spike", severity: "warning", subsystem: "Thermal Control", description: "Injects +15°C thermal anomaly in secondary cooling loop." },
  { id: "sensor-drift", label: "Sensor Drift", severity: "warning", subsystem: "Sensors", description: "Applies Gaussian noise drift to attitude determination sensors." },
  { id: "comms-loss", label: "Communication Loss", severity: "critical", subsystem: "Communication", description: "Drops uplink/downlink — spacecraft enters safe mode after 120s." },
  { id: "packet-loss", label: "Packet Loss (40%)", severity: "warning", subsystem: "Communication", description: "Simulates 40% packet loss on downlink channel." },
  { id: "rw-failure", label: "Reaction Wheel Failure", severity: "critical", subsystem: "ADCS", description: "Disables reaction wheel #2, causing attitude drift requiring thrusters." },
];

export function FaultInjectionPage() {
  const [injected, setInjected] = useState<string[]>([]);
  const [log, setLog] = useState<{ id: string; label: string; time: string; action: "injected" | "cleared" }[]>([]);

  const toggle = (fault: typeof faults[0]) => {
    const time = new Date().toLocaleTimeString();
    if (injected.includes(fault.id)) {
      setInjected(p => p.filter(f => f !== fault.id));
      setLog(p => [{ id: fault.id, label: fault.label, time, action: "cleared" as const }, ...p].slice(0, 20));
    } else {
      setInjected(p => [...p, fault.id]);
      setLog(p => [{ id: fault.id, label: fault.label, time, action: "injected" as const }, ...p].slice(0, 20));
    }
  };

  return (
    <DashboardLayout title="Fault Injection">
      <div className="space-y-6 max-w-[1440px]">
        {/* Status banner */}
        <AnimatePresence>
          {injected.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3"
            >
              <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
              <p className="text-sm font-medium text-danger">
                {injected.length} fault{injected.length > 1 ? "s" : ""} actively injected into simulation
              </p>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => { setInjected([]); setLog(p => [{ id: "all", label: "All Faults", time: new Date().toLocaleTimeString(), action: "cleared" as const }, ...p]); }}
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
              const isActive = injected.includes(fault.id);
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
                            <Badge variant={fault.severity === "critical" ? "danger" : "warning"}>{fault.severity}</Badge>
                            {isActive && <Badge variant="danger">ACTIVE</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground ml-6">{fault.subsystem}</p>
                          <p className="text-xs text-muted-foreground ml-6 mt-1 leading-relaxed">{fault.description}</p>
                        </div>
                        <Button
                          variant={isActive ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => toggle(fault)}
                          id={`fault-btn-${fault.id}`}
                          className="shrink-0 min-w-[80px]"
                        >
                          {isActive ? "Clear" : "Inject"}
                        </Button>
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
                      {log.map((entry, i) => (
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
