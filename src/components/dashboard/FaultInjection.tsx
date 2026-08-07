import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMissionSocket } from "@/hooks/useMissionSocket";

const faults = [
  { id: "SOLAR_PANEL_FAILURE", label: "Solar Panel Failure", severity: "critical", subsystem: "Power" },
  { id: "BATTERY_LEAK", label: "Battery Cell Leak", severity: "critical", subsystem: "Power" },
  { id: "THERMAL_SPIKE", label: "Thermal Spike", severity: "warning", subsystem: "Thermal" },
  { id: "SENSOR_DRIFT", label: "Sensor Drift", severity: "warning", subsystem: "Sensors" },
  { id: "COMMUNICATION_LOSS", label: "Communication Loss", severity: "critical", subsystem: "Communication" },
  { id: "PACKET_LOSS", label: "Packet Loss", severity: "warning", subsystem: "Communication" },
  { id: "REACTION_WHEEL_FAILURE", label: "Reaction Wheel Failure", severity: "critical", subsystem: "ADCS" },
  { id: "ACTUATOR_FAILURE", label: "Actuator Failure", severity: "warning", subsystem: "Instruments" },
  { id: "CONFLICTING_SENSORS", label: "Conflicting Sensors", severity: "warning", subsystem: "Sensors" },
  { id: "MISSING_TELEMETRY", label: "Missing Telemetry", severity: "info", subsystem: "Telemetry" },
];

export function FaultInjection() {
  const { activeFaults, injectFault, clearFault, missionStatus } = useMissionSocket();
  const isRunning = missionStatus === "RUNNING";

  const toggleFault = async (id: string) => {
    if (activeFaults.includes(id)) {
      await clearFault(id);
    } else {
      await injectFault(id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            <CardTitle>Fault Injection</CardTitle>
            {activeFaults.length > 0 && (
              <Badge variant="danger" className="ml-auto">{activeFaults.length} Active</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-3">
          {faults.map((fault, i) => {
            const isActive = activeFaults.includes(fault.id);
            return (
              <motion.div
                key={fault.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">{fault.label}</p>
                  <p className="text-[10px] text-muted-foreground">{fault.subsystem}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={fault.severity === "critical" ? "danger" : fault.severity === "info" ? "info" : "warning"}>
                    {fault.severity}
                  </Badge>
                  <Button
                    variant={isActive ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => toggleFault(fault.id)}
                    disabled={!isRunning}
                    id={`fault-${fault.id}`}
                    className="text-[11px] h-7 px-2.5"
                  >
                    {isActive ? "Clear" : "Inject"}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
