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

export interface ReplayEvent {
  id: string;
  type: "milestone" | "system" | "operator" | "anomaly";
  subsystem?: string;
  description: string;
  met: string;
  time: string;
  timestamp: string;
}

export function useMissionSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  // Live telemetry state
  const [telemetry, setTelemetry] = useState<LiveTelemetry | null>(null);
  const [activeFaults, setActiveFaults] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<LiveWarning[]>([]);
  const [missionStatus, setMissionStatus] = useState<string>("IDLE");
  const [missionId, setMissionId] = useState<string | null>(null);

  // Replay System State
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [replayStatus, setReplayStatus] = useState<"STOPPED" | "PLAYING" | "PAUSED">("STOPPED");
  const [replaySpeed, setReplaySpeedState] = useState<number>(1.0);
  const [replayFrameIndex, setReplayFrameIndex] = useState<number>(0);
  const [replayTotalFrames, setReplayTotalFrames] = useState<number>(0);
  const [replayTelemetry, setReplayTelemetry] = useState<LiveTelemetry | null>(null);
  const [replayState, setReplayState] = useState<any | null>(null);
  const [replayEvents, setReplayEvents] = useState<ReplayEvent[]>([]);

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

    // ── Live Telemetry Listeners ─────────────────────────────────
    s.on("telemetry_update", (data: { missionId: string; telemetry: LiveTelemetry }) => {
      if (data.telemetry && !isReplaying) {
        setTelemetry(data.telemetry);
        if (data.telemetry.faults) {
          setActiveFaults(data.telemetry.faults);
        }
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
      setIsReplaying(false);
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
      if (data?.warnings?.length && !isReplaying) {
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

    // ── Replay Socket Listeners ──────────────────────────────────
    s.on("replay_started", (data: { missionId: string; speed: number; totalFrames: number; currentFrameIndex: number }) => {
      setIsReplaying(true);
      setReplayStatus("PLAYING");
      if (typeof data.speed === "number") setReplaySpeedState(data.speed);
      if (typeof data.totalFrames === "number") setReplayTotalFrames(data.totalFrames);
      if (typeof data.currentFrameIndex === "number") setReplayFrameIndex(data.currentFrameIndex);
    });

    s.on("replay_paused", () => {
      setReplayStatus("PAUSED");
    });

    s.on("replay_resumed", () => {
      setIsReplaying(true);
      setReplayStatus("PLAYING");
    });

    s.on("replay_stopped", () => {
      setIsReplaying(false);
      setReplayStatus("STOPPED");
      setReplayFrameIndex(0);
    });

    s.on("replay_seek", (data: { currentFrameIndex: number }) => {
      if (typeof data.currentFrameIndex === "number") setReplayFrameIndex(data.currentFrameIndex);
    });

    s.on("replay_speed_changed", (data: { speed: number }) => {
      if (typeof data.speed === "number") setReplaySpeedState(data.speed);
    });

    s.on("replay_telemetry", (data: {
      telemetry: LiveTelemetry;
      state: any;
      currentFrameIndex: number;
      totalFrames: number;
      status: "STOPPED" | "PLAYING" | "PAUSED";
      speed: number;
    }) => {
      setIsReplaying(true);
      if (data.telemetry) {
        setReplayTelemetry(data.telemetry);
        setTelemetry(data.telemetry); // Update active views
        if (data.telemetry.faults) setActiveFaults(data.telemetry.faults);
      }
      if (data.state) setReplayState(data.state);
      if (typeof data.currentFrameIndex === "number") setReplayFrameIndex(data.currentFrameIndex);
      if (typeof data.totalFrames === "number") setReplayTotalFrames(data.totalFrames);
      if (data.status) setReplayStatus(data.status);
      if (typeof data.speed === "number") setReplaySpeedState(data.speed);
    });

    s.on("replay_finished", () => {
      setIsReplaying(false);
      setReplayStatus("STOPPED");
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [isReplaying]);

  // ── Live Mission Operations ──────────────────────────────────
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
        { time: 100, activity: "Downlink" },
        { time: 140, activity: "Calibration" },
        { time: 180, activity: "SafeMode" },
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
      if (json.success) {
        setMissionStatus("RUNNING");
        setIsReplaying(false);
      }
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

  // ── Replay System Operations ─────────────────────────────────
  const startReplay = async (targetMissionId?: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/replay/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionId: targetMissionId || missionId }),
      });
      const json = await res.json();
      if (json.success) {
        setIsReplaying(true);
        setReplayStatus("PLAYING");
        if (json.data) {
          setReplayTotalFrames(json.data.totalFrames ?? 0);
          setReplayFrameIndex(json.data.currentFrameIndex ?? 0);
        }
      }
      return json;
    } catch (err) {
      console.error("Failed to start replay", err);
    }
  };

  const pauseReplay = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/replay/pause`, { method: "POST" });
      const json = await res.json();
      if (json.success) setReplayStatus("PAUSED");
      return json;
    } catch (err) {
      console.error("Failed to pause replay", err);
    }
  };

  const resumeReplay = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/replay/resume`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setIsReplaying(true);
        setReplayStatus("PLAYING");
      }
      return json;
    } catch (err) {
      console.error("Failed to resume replay", err);
    }
  };

  const stopReplay = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/replay/stop`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setIsReplaying(false);
        setReplayStatus("STOPPED");
        setReplayFrameIndex(0);
      }
      return json;
    } catch (err) {
      console.error("Failed to stop replay", err);
    }
  };

  const seekReplay = async (params: { frameIndex?: number; targetTime?: number }) => {
    try {
      const res = await fetch(`${BACKEND_URL}/replay/seek`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setReplayFrameIndex(json.data.currentFrameIndex);
      }
      return json;
    } catch (err) {
      console.error("Failed to seek replay", err);
    }
  };

  const setReplaySpeed = async (speed: number) => {
    try {
      const res = await fetch(`${BACKEND_URL}/replay/speed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speed }),
      });
      const json = await res.json();
      if (json.success) setReplaySpeedState(speed);
      return json;
    } catch (err) {
      console.error("Failed to set replay speed", err);
    }
  };

  const stepReplayPrev = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/replay/step/prev`, { method: "POST" });
      return await res.json();
    } catch (err) {
      console.error("Failed to step replay prev", err);
    }
  };

  const stepReplayNext = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/replay/step/next`, { method: "POST" });
      return await res.json();
    } catch (err) {
      console.error("Failed to step replay next", err);
    }
  };

  const fetchReplayEvents = async (targetMissionId?: string) => {
    try {
      const id = targetMissionId || missionId;
      const res = await fetch(`${BACKEND_URL}/replay/events/${id || "current"}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setReplayEvents(json.data);
      }
      return json.data ?? [];
    } catch (err) {
      console.error("Failed to fetch replay events", err);
      return [];
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

    // Replay exports
    isReplaying,
    replayStatus,
    replaySpeed,
    replayFrameIndex,
    replayTotalFrames,
    replayTelemetry,
    replayState,
    replayEvents,
    startReplay,
    pauseReplay,
    resumeReplay,
    stopReplay,
    seekReplay,
    setReplaySpeed,
    stepReplayPrev,
    stepReplayNext,
    fetchReplayEvents,
  };
}
