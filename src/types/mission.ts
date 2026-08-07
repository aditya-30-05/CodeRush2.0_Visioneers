// Mission types
export type MissionPhase =
  | "Pre-Launch"
  | "Launch"
  | "Orbit Insertion"
  | "Observation"
  | "Calibration"
  | "Communication Window"
  | "Downlink"
  | "Mission Complete";

export type MissionStatus = "nominal" | "warning" | "critical" | "offline";
export type AlertSeverity = "critical" | "warning" | "info" | "resolved";
export type SubsystemStatus = "nominal" | "degraded" | "critical" | "offline";

export interface TelemetryPoint {
  time: string;
  battery: number;
  temperature: number;
  power: number;
  storage: number;
  signal: number;
}

export interface MissionMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  trend: "up" | "down" | "stable";
  trendValue: number;
  status: MissionStatus;
  min: number;
  max: number;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  timestamp: string;
  subsystem: string;
  description: string;
  resolved: boolean;
}

export interface Subsystem {
  id: string;
  name: string;
  health: number;
  status: SubsystemStatus;
  temperature?: number;
  voltage?: number;
  lastUpdate: string;
}

export interface MissionPhaseInfo {
  id: string;
  name: MissionPhase;
  startTime: string;
  endTime: string;
  duration: string;
  status: "completed" | "active" | "upcoming";
  completionPct: number;
}

export interface Anomaly {
  id: string;
  name: string;
  confidence: number;
  evidence: string[];
  rootCause: string;
  recommendedProcedure: string;
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface RecoveryStep {
  id: string;
  step: number;
  description: string;
  completed: boolean;
  estimatedTime: string;
}

export interface MissionEvent {
  id: string;
  time: string;
  met: string;
  type: "system" | "operator" | "anomaly" | "milestone";
  description: string;
  subsystem?: string;
}

export interface MissionObjective {
  id: string;
  name: string;
  progress: number;
  target: number;
  unit: string;
  status: "completed" | "in-progress" | "pending";
}
