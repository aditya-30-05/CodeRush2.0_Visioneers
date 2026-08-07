import { motion } from "framer-motion";
import { Play, Pause, Square, SkipBack, SkipForward, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMission } from "@/context/MissionContext";

const typeConfig = {
  milestone: { dot: "bg-primary", badge: "info" as const },
  system: { dot: "bg-green-500", badge: "success" as const },
  operator: { dot: "bg-purple-500", badge: "default" as const },
  anomaly: { dot: "bg-red-500 animate-pulse", badge: "danger" as const },
};

export function ReplayTimeline() {
  const {
    replayStatus,
    replaySpeed,
    replayFrameIndex,
    replayTotalFrames,
    replayTelemetry,
    replayEvents,
    startReplay,
    pauseReplay,
    resumeReplay,
    stopReplay,
    seekReplay,
    setReplaySpeed,
    stepReplayPrev,
    stepReplayNext,
  } = useMission();

  const totalFrames = Math.max(1, replayTotalFrames);
  const progress = Math.min(100, Math.max(0, (replayFrameIndex / Math.max(1, totalFrames - 1)) * 100));

  const currentMETSeconds = replayTelemetry?.missionTime ?? 0;
  const hrs = String(Math.floor(currentMETSeconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((currentMETSeconds % 3600) / 60)).padStart(2, "0");
  const secs = String(Math.floor(currentMETSeconds % 60)).padStart(2, "0");
  const playheadMET = `T+${hrs}:${mins}:${secs}`;

  const handlePlayPauseToggle = () => {
    if (replayStatus === "PLAYING") {
      pauseReplay();
    } else if (replayStatus === "PAUSED") {
      resumeReplay();
    } else {
      startReplay();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetFrame = Math.round(ratio * (totalFrames - 1));
    seekReplay({ frameIndex: targetFrame });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              <CardTitle>Replay Controls</CardTitle>
            </div>
            <Badge variant={replayStatus === "PLAYING" ? "danger" : replayStatus === "PAUSED" ? "warning" : "secondary"}>
              {playheadMET}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-3">
          {/* Scrubber */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground mono">T+00:00:00</span>
              <span className="text-foreground mono font-medium">{playheadMET}</span>
              <span className="text-muted-foreground mono">End (Frame {replayFrameIndex + 1}/{totalFrames})</span>
            </div>
            <div className="relative cursor-pointer" onClick={handleProgressClick}>
              <Progress value={progress} className="h-2" />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-primary border-2 border-white shadow-md cursor-pointer"
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" onClick={stepReplayPrev} id="replay-skip-back" title="Previous Frame">
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className="h-9 w-9"
                id="replay-play-pause"
                onClick={handlePlayPauseToggle}
                title={replayStatus === "PLAYING" ? "Pause" : "Play"}
              >
                {replayStatus === "PLAYING" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={stopReplay}
                id="replay-stop-widget"
                title="Stop Replay"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </Button>

              <Button variant="ghost" size="icon" onClick={stepReplayNext} id="replay-skip-forward" title="Next Frame">
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Speed:</span>
              {[0.5, 1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setReplaySpeed(s)}
                  className={cn(
                    "rounded px-1.5 py-0.5 font-mono text-[11px] font-medium transition-colors",
                    replaySpeed === s ? "bg-primary text-white" : "hover:bg-muted text-foreground"
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          {/* Event log */}
          <ScrollArea className="h-[180px] -mx-1 px-1">
            <div className="space-y-1">
              {(replayEvents && replayEvents.length > 0 ? replayEvents : [
                { id: "e1", type: "milestone" as const, description: "Historical telemetry recorded in database", met: "T+00:00:00" }
              ]).map((evt, idx) => {
                const config = typeConfig[evt.type] ?? typeConfig.system;
                return (
                  <div
                    key={evt.id || idx}
                    className="flex gap-3 items-start rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      const parsedMet = evt.met ? parseInt(evt.met.replace("T+", "").split(":")[0]) * 60 + parseInt(evt.met.replace("T+", "").split(":")[1] || "0") : 0;
                      seekReplay({ targetTime: parsedMet });
                    }}
                  >
                    <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0", config.dot)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground">{evt.met}</span>
                        <Badge variant={config.badge} className="text-[10px] py-0">{evt.type}</Badge>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">{evt.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}
