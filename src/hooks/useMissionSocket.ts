import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const BACKEND_URL = "http://localhost:4000";

export interface LiveTelemetry {
  sequenceNumber: number;
  timestamp: number;
  missionTime: number;
  missionName: string;
  missionPhase: string;
  battery: number;
  batteryVoltage: number;
  batteryCharging: boolean;
  solarGeneration: number;
  powerGeneration: number;
  powerConsumption: number;
  temperature: number;
  storageUsedMB: number;
  storagePct: number;
  signalStrength: number;
  windowOpen: boolean;
  packetLoss: number;
  latencyMs: number;
  orientation: string;
  activity: string;
  safeMode: boolean;
  faults: string[];
  warnings: string[];
}

export interface LiveWarning {
  id: string;
  message: string;
  severity: "critical" | "warning" | "info" | "resolved";
  timestamp: string;
  missionTime: number;
}

export function useMissionSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState<LiveTelemetry | null>(null);
  const [activeFaults, setActiveFaults] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<LiveWarning[]>([]);
  const [missionStatus, setMissionStatus] = useState<string>("IDLE");
  const [missionId, setMissionId] = useState<string | null>(null);

  useEffect(() => {
    const s = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
    });

    s.on("connect", () => {
      setConnected(true);
    });

    s.on("disconnect", () => {
      setConnected(false);
    });

    s.on("telemetry_update", (data: { missionId: string; telemetry: LiveTelemetry }) => {
      if (data.telemetry) {
        setTelemetry(data.telemetry);
        if (data.telemetry.faults) {
          setActiveFaults(data.telemetry.faults);
        }
        // Extract warnings from each telemetry tick
        if (data.telemetry.warnings?.length) {
          const newWarnings: LiveWarning[] = data.telemetry.warnings.map((msg: string, i: number) => ({
            id: `w-${Date.now()}-${i}`,
            message: msg,
            severity: msg.startsWith('CASCADE:') || msg.startsWith('EMERGENCY:') ? 'critical' as const
                    : msg.startsWith('FAULT:') ? 'warning' as const
                    : msg.startsWith('RECOVERED:') ? 'resolved' as const
                    : 'info' as const,
            timestamp: new Date().toISOString(),
            missionTime: data.telemetry.missionTime,
          }));
          setWarnings(prev => [...newWarnings, ...prev].slice(0, 100));
        }
      }
    });

    s.on("mission_loaded", (data: { missionId: string; status: string }) => {
      setMissionId(data.missionId);
      setMissionStatus(data.status);
    });

    s.on("mission_started", (data: { status: string }) => {
      setMissionStatus(data.status || "RUNNING");
    });

    s.on("mission_paused", () => setMissionStatus("PAUSED"));
    s.on("mission_resumed", () => setMissionStatus("RUNNING"));
    s.on("mission_stopped", () => setMissionStatus("STOPPED"));
    s.on("mission_reset", () => setMissionStatus("LOADED"));

    s.on("fault_injected", (data: { fault: { id: string } }) => {
      if (data?.fault?.id) {
        setActiveFaults((prev) => Array.from(new Set([...prev, data.fault.id])));
      }
    });

    s.on("fault_cleared", (data: { faultId: string }) => {
      if (data?.faultId) {
        setActiveFaults((prev) => prev.filter((id) => id !== data.faultId));
      }
    });

    s.on("fault_expired", (data: { faultId: string }) => {
      if (data?.faultId) {
        setActiveFaults((prev) => prev.filter((id) => id !== data.faultId));
      }
    });

    s.on("warning_generated", (data: { warnings: string[]; missionTime: number }) => {
      if (data?.warnings?.length) {
        const newWarnings: LiveWarning[] = data.warnings.map((msg: string, i: number) => ({
          id: `wg-${Date.now()}-${i}`,
          message: msg,
          severity: msg.startsWith('CASCADE:') || msg.startsWith('EMERGENCY:') ? 'critical' as const
                  : msg.startsWith('FAULT:') ? 'warning' as const
                  : msg.startsWith('RECOVERED:') ? 'resolved' as const
                  : 'info' as const,
          timestamp: new Date().toISOString(),
          missionTime: data.missionTime,
        }));
        setWarnings(prev => [...newWarnings, ...prev].slice(0, 100));
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const loadMission = async (missionData?: object) => {
    const defaultData = missionData || {
      missionName: "OrbitOps Earth Observation Alpha",
      duration: 600,
      initialBattery: 95,
      initialTemp: 22,
      storageMB: 2048,
      timeline: [
        { time: 0, activity: "Idle" },
        { time: 30, activity: "Rotate", parameters: { targetPointing: "TARGET_POINTING" } },
        { time: 60, activity: "Observation", parameters: { pointingMode: "TARGET_POINTING" } },
        { time: 180, activity: "Downlink" },
        { time: 240, activity: "Calibration" },
        { time: 300, activity: "SafeMode" },
      ],
    };

    try {
      const res = await fetch(`${BACKEND_URL}/mission/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionData: defaultData }),
      });
      const json = await res.json();
      if (json.success) {
        setMissionId(json.data.id);
        setMissionStatus("LOADED");
      }
      return json;
    } catch (err) {
      console.error("Failed to load mission", err);
    }
  };

  const startMission = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/mission/start`, { method: "POST" });
      const json = await res.json();
      if (json.success) setMissionStatus("RUNNING");
      return json;
    } catch (err) {
      console.error("Failed to start mission", err);
    }
  };

  const pauseMission = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/mission/pause`, { method: "POST" });
      const json = await res.json();
      if (json.success) setMissionStatus("PAUSED");
      return json;
    } catch (err) {
      console.error("Failed to pause mission", err);
    }
  };

  const resumeMission = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/mission/resume`, { method: "POST" });
      const json = await res.json();
      if (json.success) setMissionStatus("RUNNING");
      return json;
    } catch (err) {
      console.error("Failed to resume mission", err);
    }
  };

  const injectFault = async (faultId: string, options?: { duration?: number; severity?: string }) => {
    try {
      const body: Record<string, unknown> = { faultId };
      if (options?.duration)  body.duration  = options.duration;
      if (options?.severity)  body.severity  = options.severity;
      const res = await fetch(`${BACKEND_URL}/fault/inject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (err) {
      console.error("Failed to inject fault", err);
    }
  };

  const clearFault = async (faultId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/fault/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faultId }),
      });
      return await res.json();
    } catch (err) {
      console.error("Failed to clear fault", err);
    }
  };

  return {
    socket,
    connected,
    telemetry,
    activeFaults,
    warnings,
    missionStatus,
    missionId,
    loadMission,
    startMission,
    pauseMission,
    resumeMission,
    injectFault,
    clearFault,
  };
}
