import { useState } from "react";
import { motion } from "framer-motion";
import { Satellite, Clock, TrendingUp, Play, Pause, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMission } from "@/context/MissionContext";

export function MissionBanner() {
  const { telemetry, missionStatus, startMission, pauseMission, resumeMission, loadMission } = useMission();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metSeconds = telemetry?.missionTime || 0;
  const hrs = String(Math.floor(metSeconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((metSeconds % 3600) / 60)).padStart(2, "0");
  const secs = String(metSeconds % 60).padStart(2, "0");
  const metFormatted = `T+${hrs}:${mins}:${secs}`;

  const handleLoadAndStart = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadResult = await loadMission();
      if (!loadResult || !loadResult.success) {
        setError(loadResult?.message || "Failed to load mission");
        return;
      }
      const startResult = await startMission();
      if (!startResult || !startResult.success) {
        setError(startResult?.message || "Failed to start mission");
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
      console.error("Load & Start Mission error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border bg-white p-5 card-shadow"
    >
      <div className="flex items-center justify-between gap-6">
        {/* Left: Mission identity */}
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Satellite className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground mono">{telemetry?.missionName || "OrbitOps Alpha"}</h2>
              <Badge variant={missionStatus === "RUNNING" ? "success" : "warning"}>{missionStatus}</Badge>
              <Badge variant="info">{telemetry?.activity || "Observation"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">ISRO Low-Earth Orbit Observation Mission · 2026</p>
            {error && (
              <p className="text-xs text-red-500 mt-1">⚠ {error}</p>
            )}
          </div>
        </div>

        {/* Center: Mission Controls */}
        <div className="flex items-center gap-2">
          {missionStatus === "IDLE" || missionStatus === "STOPPED" ? (
            <Button
              size="sm"
              onClick={handleLoadAndStart}
              disabled={isLoading}
              id="load-start-mission-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Loading...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 mr-1" /> Load &amp; Start Mission
                </>
              )}
            </Button>
          ) : missionStatus === "PAUSED" ? (
            <Button size="sm" variant="outline" onClick={() => resumeMission()} id="resume-mission-btn">
              <Play className="h-3.5 w-3.5 mr-1" /> Resume
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => pauseMission()} id="pause-mission-btn">
              <Pause className="h-3.5 w-3.5 mr-1" /> Pause
            </Button>
          )}
        </div>

        {/* Right: Key stats */}
        <div className="flex items-center gap-6 divide-x divide-border">
          <div className="text-center pr-6">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
              <Clock className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide font-medium">MET</span>
            </div>
            <p className="text-sm font-bold mono text-foreground">{metFormatted}</p>
          </div>
          <div className="text-center px-6">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide font-medium">Sequence</span>
            </div>
            <p className="text-sm font-bold mono text-foreground">#{telemetry?.sequenceNumber || 0}</p>
          </div>
          <div className="text-center pl-6">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
              <span className="text-[10px] uppercase tracking-wide font-medium">Orbital Status</span>
            </div>
            <Badge variant="success">IN ORBIT</Badge>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
