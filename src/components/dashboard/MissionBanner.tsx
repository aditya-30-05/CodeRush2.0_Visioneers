import { motion } from "framer-motion";
import { Satellite, Clock, TrendingUp, Play, Pause, RefreshCw, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useMission } from "@/context/MissionContext";

export function MissionBanner() {
  const { telemetry, missionStatus, startMission, pauseMission, resumeMission, loadMission } = useMission();

  const metSeconds = telemetry?.missionTime || 0;
  const hrs = String(Math.floor(metSeconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((metSeconds % 3600) / 60)).padStart(2, "0");
  const secs = String(metSeconds % 60).padStart(2, "0");
  const metFormatted = `T+${hrs}:${mins}:${secs}`;

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
          </div>
        </div>

        {/* Center: Mission Controls */}
        <div className="flex items-center gap-2">
          {missionStatus === "IDLE" || missionStatus === "STOPPED" ? (
            <Button size="sm" onClick={() => loadMission().then(() => startMission())}>
              <Play className="h-3.5 w-3.5 mr-1" /> Load & Start Mission
            </Button>
          ) : missionStatus === "PAUSED" ? (
            <Button size="sm" variant="outline" onClick={() => resumeMission()}>
              <Play className="h-3.5 w-3.5 mr-1" /> Resume
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => pauseMission()}>
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
