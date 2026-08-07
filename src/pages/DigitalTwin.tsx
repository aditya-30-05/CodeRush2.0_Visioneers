import React, { useState } from 'react';
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
import { useMission } from "@/context/MissionContext";

// New Digital Twin Modular Systems
import { DigitalTwinMode, DigitalTwinModeType } from "@/components/digital-twin/DigitalTwinMode";
import { LiveSimulationView } from "@/components/digital-twin/LiveSimulationView";
import { ReplayTwinView } from "@/components/digital-twin/ReplayTwinView";
import { WhatIfSimulation } from "@/components/digital-twin/WhatIfSimulation";
import { PredictionPanel } from "@/components/digital-twin/PredictionPanel";

const statusBadge: Record<SubsystemStatus, "success" | "warning" | "danger" | "secondary"> = {
  nominal: "success",
  degraded: "warning",
  critical: "danger",
  offline: "secondary",
};

const radarData = subsystemsData.map(s => ({
  subject: s.name.replace(" Pack", "").replace(" Control", "").replace(" Panels", ""),
  health: s.health,
}));

export function DigitalTwinPage() {
  const mission = useMission();
  const [mode, setMode] = useState<DigitalTwinModeType>('LIVE_SIM');

  // Dynamic subsystem health derived from live telemetry if connected
  const activeFaults = mission.activeFaults || [];
  const telemetry = mission.telemetry;

  const currentSubsystems = subsystemsData.map(s => {
    let health = s.health;
    let status = s.status;

    if (telemetry) {
      if (s.name.includes("Battery") || s.name.includes("Power")) {
        health = Math.round(telemetry.battery);
        status = health < 30 ? "critical" : health < 70 ? "degraded" : "nominal";
      } else if (s.name.includes("Thermal")) {
        health = telemetry.temperature > 60 ? 35 : telemetry.temperature > 45 ? 75 : 98;
        status = telemetry.temperature > 60 ? "critical" : telemetry.temperature > 45 ? "degraded" : "nominal";
      } else if (s.name.includes("Communication")) {
        health = Math.round(telemetry.signalStrength);
        status = health > 75 ? "nominal" : health > 30 ? "degraded" : "critical";
      }
    }

    if (activeFaults.some(f => f.toLowerCase().includes(s.id.toLowerCase()) || f.toLowerCase().includes(s.name.toLowerCase()))) {
      status = "critical";
      health = Math.min(health, 40);
    }

    return { ...s, health, status };
  });

  const updatedRadarData = currentSubsystems.map(s => ({
    subject: s.name.replace(" Pack", "").replace(" Control", "").replace(" Panels", ""),
    health: s.health,
  }));

  return (
    <DashboardLayout title="Digital Twin Operations Center">
      <div className="space-y-6 max-w-[1440px]">
        {/* Mode Selector System */}
        <DigitalTwinMode currentMode={mode} onModeChange={setMode} />

        {/* Operational Mode View Container */}
        {mode === 'LIVE_SIM' && (
          <LiveSimulationView telemetry={mission.telemetry} activeFaults={mission.activeFaults || []} />
        )}

        {mode === 'REPLAY' && <ReplayTwinView />}

        {mode === 'WHAT_IF' && <WhatIfSimulation liveTelemetry={mission.telemetry} />}

        {mode === 'PREDICTION' && <PredictionPanel telemetry={mission.telemetry} />}

        {/* Existing Subsystem Health Radar & Cards (Preserved Intact) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-4">
          {/* Radar */}
          <Card>
            <CardHeader><CardTitle>System Health Radar</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={updatedRadarData}>
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
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Subsystem Health Overview</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="success">{currentSubsystems.filter(s => s.status === "nominal").length} Nominal</Badge>
                    <Badge variant="warning">{currentSubsystems.filter(s => s.status === "degraded").length} Degraded</Badge>
                    <Badge variant="danger">{currentSubsystems.filter(s => s.status === "critical").length} Critical</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {currentSubsystems.map((sub, i) => (
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
