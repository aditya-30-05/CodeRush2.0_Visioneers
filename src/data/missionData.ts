import type {
  TelemetryPoint,
  MissionMetric,
  Alert,
  Subsystem,
  MissionPhaseInfo,
  Anomaly,
  RecoveryStep,
  MissionEvent,
  MissionObjective,
} from "@/types/mission";

// ─── Telemetry ────────────────────────────────────────────────────────────────
export const telemetryData: TelemetryPoint[] = [
  { time: "T+00:00", battery: 98, temperature: 22, power: 420, storage: 12, signal: 92 },
  { time: "T+01:00", battery: 97, temperature: 23, power: 418, storage: 14, signal: 93 },
  { time: "T+02:00", battery: 96, temperature: 24, power: 415, storage: 17, signal: 91 },
  { time: "T+03:00", battery: 94, temperature: 26, power: 410, storage: 20, signal: 90 },
  { time: "T+04:00", battery: 93, temperature: 28, power: 408, storage: 23, signal: 88 },
  { time: "T+05:00", battery: 91, temperature: 31, power: 405, storage: 27, signal: 87 },
  { time: "T+06:00", battery: 90, temperature: 34, power: 402, storage: 30, signal: 89 },
  { time: "T+07:00", battery: 88, temperature: 37, power: 400, storage: 34, signal: 91 },
  { time: "T+08:00", battery: 86, temperature: 41, power: 395, storage: 38, signal: 90 },
  { time: "T+09:00", battery: 84, temperature: 43, power: 390, storage: 42, signal: 85 },
  { time: "T+10:00", battery: 83, temperature: 39, power: 388, storage: 46, signal: 82 },
  { time: "T+11:00", battery: 81, temperature: 35, power: 385, storage: 49, signal: 80 },
  { time: "T+12:00", battery: 80, temperature: 33, power: 382, storage: 53, signal: 79 },
];

// ─── Dashboard Metrics ────────────────────────────────────────────────────────
export const dashboardMetrics: MissionMetric[] = [
  {
    id: "battery",
    label: "Battery",
    value: 80,
    unit: "%",
    trend: "down",
    trendValue: 2.1,
    status: "warning",
    min: 0,
    max: 100,
  },
  {
    id: "temperature",
    label: "Temperature",
    value: 33,
    unit: "°C",
    trend: "down",
    trendValue: 3.5,
    status: "nominal",
    min: -30,
    max: 85,
  },
  {
    id: "power",
    label: "Power Output",
    value: 382,
    unit: "W",
    trend: "down",
    trendValue: 1.2,
    status: "nominal",
    min: 0,
    max: 500,
  },
  {
    id: "storage",
    label: "Storage Used",
    value: 53,
    unit: "%",
    trend: "up",
    trendValue: 4.0,
    status: "nominal",
    min: 0,
    max: 100,
  },
  {
    id: "communication",
    label: "Signal Strength",
    value: 79,
    unit: "dBm",
    trend: "down",
    trendValue: 1.3,
    status: "warning",
    min: 0,
    max: 100,
  },
];

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const alertsData: Alert[] = [
  {
    id: "ALT-001",
    severity: "critical",
    timestamp: "T+12:04:33",
    subsystem: "Thermal",
    description: "Core temperature exceeded nominal threshold by 8°C",
    resolved: false,
  },
  {
    id: "ALT-002",
    severity: "warning",
    timestamp: "T+11:58:12",
    subsystem: "Battery",
    description: "Cell voltage imbalance detected — Δ 0.12V across pack",
    resolved: false,
  },
  {
    id: "ALT-003",
    severity: "warning",
    timestamp: "T+11:45:00",
    subsystem: "Communication",
    description: "Signal attenuation above predicted — possible antenna obstruction",
    resolved: false,
  },
  {
    id: "ALT-004",
    severity: "info",
    timestamp: "T+11:30:45",
    subsystem: "Reaction Wheel",
    description: "Wheel RPM variation within acceptable jitter range",
    resolved: false,
  },
  {
    id: "ALT-005",
    severity: "resolved",
    timestamp: "T+10:15:22",
    subsystem: "Solar Panel",
    description: "Panel A efficiency drop resolved after reorientation",
    resolved: true,
  },
];

// ─── Subsystems ───────────────────────────────────────────────────────────────
export const subsystemsData: Subsystem[] = [
  { id: "battery", name: "Battery Pack", health: 80, status: "degraded", voltage: 3.82, lastUpdate: "T+12:04" },
  { id: "solar", name: "Solar Panels", health: 94, status: "nominal", lastUpdate: "T+12:04" },
  { id: "thermal", name: "Thermal Control", health: 61, status: "critical", temperature: 41, lastUpdate: "T+12:04" },
  { id: "comms", name: "Communication", health: 79, status: "degraded", lastUpdate: "T+12:04" },
  { id: "storage", name: "Mass Storage", health: 97, status: "nominal", lastUpdate: "T+12:04" },
  { id: "camera", name: "Imaging Payload", health: 100, status: "nominal", lastUpdate: "T+12:04" },
  { id: "rw", name: "Reaction Wheel", health: 88, status: "nominal", lastUpdate: "T+12:04" },
];

// ─── Mission Phases ───────────────────────────────────────────────────────────
export const missionPhases: MissionPhaseInfo[] = [
  { id: "phase-1", name: "Pre-Launch", startTime: "T-00:30", endTime: "T+00:00", duration: "30m", status: "completed", completionPct: 100 },
  { id: "phase-2", name: "Launch", startTime: "T+00:00", endTime: "T+02:00", duration: "2h", status: "completed", completionPct: 100 },
  { id: "phase-3", name: "Orbit Insertion", startTime: "T+02:00", endTime: "T+05:00", duration: "3h", status: "completed", completionPct: 100 },
  { id: "phase-4", name: "Calibration", startTime: "T+05:00", endTime: "T+08:00", duration: "3h", status: "completed", completionPct: 100 },
  { id: "phase-5", name: "Observation", startTime: "T+08:00", endTime: "T+14:00", duration: "6h", status: "active", completionPct: 67 },
  { id: "phase-6", name: "Communication Window", startTime: "T+14:00", endTime: "T+16:00", duration: "2h", status: "upcoming", completionPct: 0 },
  { id: "phase-7", name: "Downlink", startTime: "T+16:00", endTime: "T+18:00", duration: "2h", status: "upcoming", completionPct: 0 },
  { id: "phase-8", name: "Mission Complete", startTime: "T+18:00", endTime: "T+18:30", duration: "30m", status: "upcoming", completionPct: 0 },
];

// ─── Mission Objectives ───────────────────────────────────────────────────────
export const missionObjectives: MissionObjective[] = [
  { id: "obj-1", name: "Images Captured", progress: 847, target: 1200, unit: "frames", status: "in-progress" },
  { id: "obj-2", name: "Orbit Cycles", progress: 8, target: 12, unit: "orbits", status: "in-progress" },
  { id: "obj-3", name: "Science Data", progress: 53, target: 100, unit: "GB", status: "in-progress" },
  { id: "obj-4", name: "Calibration Tasks", progress: 5, target: 5, unit: "tasks", status: "completed" },
  { id: "obj-5", name: "Attitude Maneuvers", progress: 3, target: 8, unit: "maneuvers", status: "in-progress" },
];

// ─── Anomalies ────────────────────────────────────────────────────────────────
export const anomalyData: Anomaly[] = [
  {
    id: "ANO-001",
    name: "Thermal Subsystem Overheating",
    confidence: 94,
    evidence: [
      "Core temperature 41°C — 8°C above nominal",
      "Cooling loop flow rate reduced by 18%",
      "Thermal sensor TH-04 showing drift pattern",
    ],
    rootCause: "Partial blockage in secondary cooling loop — likely micrometeorite debris impact on radiator panel",
    recommendedProcedure: "PROC-TH-002: Emergency Thermal Recovery",
    riskLevel: "high",
  },
];

// ─── Recovery Procedure ───────────────────────────────────────────────────────
export const recoverySteps: RecoveryStep[] = [
  { id: "step-1", step: 1, description: "Switch primary coolant loop to secondary circuit", completed: true, estimatedTime: "2 min" },
  { id: "step-2", step: 2, description: "Reduce imaging payload power draw by 30%", completed: true, estimatedTime: "1 min" },
  { id: "step-3", step: 3, description: "Reorient spacecraft to shadowed attitude for 10 minutes", completed: false, estimatedTime: "10 min" },
  { id: "step-4", step: 4, description: "Activate emergency radiator vane deployment", completed: false, estimatedTime: "3 min" },
  { id: "step-5", step: 5, description: "Monitor temperature for stabilization — target < 33°C", completed: false, estimatedTime: "15 min" },
  { id: "step-6", step: 6, description: "Resume nominal operations after confirmation", completed: false, estimatedTime: "5 min" },
];

// ─── Mission Events ───────────────────────────────────────────────────────────
export const missionEvents: MissionEvent[] = [
  { id: "evt-01", time: "08:00:00 UTC", met: "T+00:00:00", type: "milestone", description: "Mission clock started — all systems nominal" },
  { id: "evt-02", time: "08:02:15 UTC", met: "T+00:02:15", type: "system", description: "Separation confirmed — solar panels deployed", subsystem: "Solar Panel" },
  { id: "evt-03", time: "08:05:44 UTC", met: "T+00:05:44", type: "system", description: "First acquisition of signal — Bangalore ground station", subsystem: "Communication" },
  { id: "evt-04", time: "10:00:00 UTC", met: "T+02:00:00", type: "milestone", description: "Orbit insertion burn complete — target orbit achieved" },
  { id: "evt-05", time: "13:00:00 UTC", met: "T+05:00:00", type: "milestone", description: "Calibration phase initiated" },
  { id: "evt-06", time: "14:15:22 UTC", met: "T+06:15:22", type: "operator", description: "Operator CMD-044: Adjust pointing by +0.02° azimuth" },
  { id: "evt-07", time: "16:00:00 UTC", met: "T+08:00:00", type: "milestone", description: "Observation phase commenced — imaging payload active" },
  { id: "evt-08", time: "17:47:33 UTC", met: "T+09:47:33", type: "anomaly", description: "Anomaly detected: thermal exceedance in secondary loop", subsystem: "Thermal" },
  { id: "evt-09", time: "17:51:10 UTC", met: "T+09:51:10", type: "operator", description: "Operator initiated PROC-TH-002 emergency thermal recovery" },
  { id: "evt-10", time: "18:04:33 UTC", met: "T+12:04:33", type: "system", description: "Recovery step 1 & 2 executed — temperature stabilizing", subsystem: "Thermal" },
];

// ─── Mission Config ───────────────────────────────────────────────────────────
export const missionConfig = {
  name: "ISRO-SAT-4B",
  phase: "Observation" as const,
  met: "T+12:04:33",
  missionElapsedSeconds: 43473,
  simulationStatus: "LIVE SIM",
  operator: "Suyash M.",
  successProbability: 87,
  missionProgress: 62,
};
