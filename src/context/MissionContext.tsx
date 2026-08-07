import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useMissionSocket, LiveTelemetry } from "@/hooks/useMissionSocket";
import { telemetryData as initialTelemetryData } from "@/data/missionData";

interface MissionContextType extends ReturnType<typeof useMissionSocket> {
  telemetryHistory: any[];
}

const MissionContext = createContext<MissionContextType | undefined>(undefined);

export function MissionProvider({ children }: { children: ReactNode }) {
  const socketState = useMissionSocket();
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>(initialTelemetryData);

  useEffect(() => {
    if (socketState.telemetry) {
      setTelemetryHistory(prev => {
        // Format telemetry to match the chart data format
        const t = socketState.telemetry;
        
        const metSeconds = t!.missionTime || 0;
        const hrs = String(Math.floor(metSeconds / 3600)).padStart(2, "0");
        const mins = String(Math.floor((metSeconds % 3600) / 60)).padStart(2, "0");
        
        const newPoint = {
          time: `T+${hrs}:${mins}`,
          battery: Math.round(t!.battery),
          temperature: Math.round(t!.temperature),
          power: Math.round(t!.powerGeneration || t!.solarGeneration || 0),
          storage: Math.round(t!.storagePct),
          signal: Math.round(t!.signalStrength)
        };
        
        // Don't add duplicate times if they are too frequent, but for simplicity let's just append and slice
        const newHistory = [...prev, newPoint];
        // keep last 50 points
        if (newHistory.length > 50) return newHistory.slice(newHistory.length - 50);
        return newHistory;
      });
    }
  }, [socketState.telemetry]);

  return (
    <MissionContext.Provider value={{ ...socketState, telemetryHistory }}>
      {children}
    </MissionContext.Provider>
  );
}

export function useMission() {
  const context = useContext(MissionContext);
  if (context === undefined) {
    throw new Error("useMission must be used within a MissionProvider");
  }
  return context;
}
