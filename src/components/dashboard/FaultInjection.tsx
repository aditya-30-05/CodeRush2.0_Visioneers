import { useState } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const faults = [
  { id: "solar-failure", label: "Inject Solar Failure", severity: "critical", subsystem: "Solar Panel" },
  { id: "battery-leak", label: "Inject Battery Leak", severity: "critical", subsystem: "Battery" },
  { id: "thermal-spike", label: "Inject Thermal Spike", severity: "warning", subsystem: "Thermal" },
  { id: "sensor-drift", label: "Inject Sensor Drift", severity: "warning", subsystem: "Sensors" },
  { id: "comms-loss", label: "Inject Communication Loss", severity: "critical", subsystem: "Communication" },
  { id: "packet-loss", label: "Inject Packet Loss", severity: "warning", subsystem: "Communication" },
  { id: "rw-failure", label: "Inject Reaction Wheel Failure", severity: "critical", subsystem: "Reaction Wheel" },
];

export function FaultInjection() {
  const [injected, setInjected] = useState<string[]>([]);

  const toggleFault = (id: string) => {
    setInjected((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
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
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-3">
          {faults.map((fault, i) => {
            const isActive = injected.includes(fault.id);
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
                  <Badge variant={fault.severity === "critical" ? "danger" : "warning"}>
                    {fault.severity}
                  </Badge>
                  <Button
                    variant={isActive ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => toggleFault(fault.id)}
                    id={`fault-${fault.id}`}
                    className="text-[11px] h-7 px-2.5"
                  >
                    {isActive ? "Active" : "Inject"}
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
