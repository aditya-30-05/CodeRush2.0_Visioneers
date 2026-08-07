import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useMissionSocket } from "@/hooks/useMissionSocket";
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

/**
 * Derive subsystem health from live telemetry data.
 * Each subsystem's health is computed from relevant telemetry values
 * and the active fault list.
 */
function deriveSubsystems(
  telemetry: ReturnType<typeof useMissionSocket>["telemetry"],
  activeFaults: string[]
) {
  if (!telemetry) {
    return [
      { id: "battery", name: "Battery Pack", health: 100, status: "nominal" as SubsystemStatus },
      { id: "solar", name: "Solar Panels", health: 100, status: "nominal" as SubsystemStatus },
      { id: "thermal", name: "Thermal Control", health: 100, status: "nominal" as SubsystemStatus },
      { id: "comms", name: "Communication", health: 100, status: "nominal" as SubsystemStatus },
      { id: "storage", name: "Mass Storage", health: 100, status: "nominal" as SubsystemStatus },
      { id: "adcs", name: "Attitude Control", health: 100, status: "nominal" as SubsystemStatus },
      { id: "instruments", name: "Instruments", health: 100, status: "nominal" as SubsystemStatus },
    ];
  }

  function calcStatus(health: number): SubsystemStatus {
    if (health <= 0) return "offline";
    if (health < 30) return "critical";
    if (health < 60) return "degraded";
    return "nominal";
  }

  // Battery health based on percentage
  const batteryHealth = Math.round(telemetry.battery);
  const batteryFault = activeFaults.includes("BATTERY_LEAK");

  // Solar health: 0 if solar failure fault, else based on generation
  const solarFault = activeFaults.includes("SOLAR_PANEL_FAILURE");
  const solarHealth = solarFault ? 0 : Math.min(100, Math.round((telemetry.solarGeneration / 450) * 100));

  // Thermal health: inversely proportional to temperature severity
  const tempNorm = Math.max(0, 100 - Math.max(0, (telemetry.temperature - 30) * 2));
  const thermalFault = activeFaults.includes("THERMAL_SPIKE");

  // Communication health
  const commsFault = activeFaults.includes("COMMUNICATION_LOSS");
  const packetFault = activeFaults.includes("PACKET_LOSS");
  const commsHealth = commsFault ? 0 : packetFault ? 40 : Math.round(telemetry.signalStrength);

  // Storage health: based on remaining capacity
  const storageHealth = Math.round(100 - telemetry.storagePct);

  // ADCS health
  const rwFault = activeFaults.includes("REACTION_WHEEL_FAILURE");
  const adcsHealth = rwFault ? 0 : 95;

  // Instruments health
  const actuatorFault = activeFaults.includes("ACTUATOR_FAILURE");
  const instrumentHealth = actuatorFault ? 10 : 100;

  return [
    { id: "battery", name: "Battery Pack", health: batteryHealth, status: batteryFault ? "degraded" as SubsystemStatus : calcStatus(batteryHealth) },
    { id: "solar", name: "Solar Panels", health: solarHealth, status: solarFault ? "offline" as SubsystemStatus : calcStatus(solarHealth) },
    { id: "thermal", name: "Thermal Control", health: Math.round(tempNorm), status: thermalFault ? "critical" as SubsystemStatus : calcStatus(Math.round(tempNorm)) },
    { id: "comms", name: "Communication", health: commsHealth, status: commsFault ? "offline" as SubsystemStatus : calcStatus(commsHealth) },
    { id: "storage", name: "Mass Storage", health: storageHealth, status: calcStatus(storageHealth) },
    { id: "adcs", name: "Attitude Control", health: adcsHealth, status: rwFault ? "offline" as SubsystemStatus : calcStatus(adcsHealth) },
    { id: "instruments", name: "Instruments", health: instrumentHealth, status: actuatorFault ? "critical" as SubsystemStatus : calcStatus(instrumentHealth) },
  ];
}

export function DigitalTwin() {
  const { telemetry, activeFaults } = useMissionSocket();
  const subsystems = useMemo(
    () => deriveSubsystems(telemetry, activeFaults),
    [telemetry, activeFaults]
  );

  const activeCount = subsystems.filter(s => s.status === "nominal").length;

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
            <Badge variant={activeCount === subsystems.length ? "success" : "warning"}>
              {activeCount}/{subsystems.length} Nominal
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          {subsystems.map((sub, i) => (
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
