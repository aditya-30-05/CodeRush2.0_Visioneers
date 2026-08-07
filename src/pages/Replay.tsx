import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Play, Pause, Square, SkipBack, SkipForward, RotateCcw, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMission } from "@/context/MissionContext";

const typeConfig = {
  milestone: { dot: "bg-primary", badge: "info" as const, label: "Milestone" },
  system: { dot: "bg-green-500", badge: "success" as const, label: "System" },
  operator: { dot: "bg-purple-500", badge: "default" as const, label: "Operator" },
  anomaly: { dot: "bg-red-500 animate-pulse", badge: "danger" as const, label: "Anomaly" },
};

export function Replay() {
  const {
    isReplaying,
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
    fetchReplayEvents,
    fetchReplayMissions,
    missionId,
  } = useMission();

  const [filter, setFilter] = useState<string>("all");
  const [historyMissions, setHistoryMissions] = useState<any[]>([]);

  useEffect(() => {
    fetchReplayEvents(missionId || undefined);
    fetchReplayMissions().then(list => {
      if (Array.isArray(list)) setHistoryMissions(list);
    });
  }, [missionId]);

  const totalFrames = Math.max(1, replayTotalFrames);
  const progressPct = Math.min(100, Math.max(0, (replayFrameIndex / Math.max(1, totalFrames - 1)) * 100));

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

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetFrame = Math.round(ratio * (totalFrames - 1));
    seekReplay({ frameIndex: targetFrame });
  };

  const displayEvents = replayEvents && replayEvents.length > 0 ? replayEvents : [
    { id: "e1", type: "milestone" as const, subsystem: "Mission Control", description: "Mission playback timeline loaded from Supabase DB", met: "T+00:00:00", time: "00:00:00", timestamp: new Date().toISOString() },
  ];

  const filteredEvents = filter === "all" ? displayEvents : displayEvents.filter(e => e.type === filter);

  const exportLogHistory = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(displayEvents, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mission-log-history-${missionId || "current"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <DashboardLayout title="Replay">
      <div className="max-w-[1440px] space-y-5">

        {/* Database-Backed Mission History Selector */}
        {historyMissions.length > 0 && (
          <Card>
            <CardHeader className="py-3.5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Database Recorded Mission Sessions</CardTitle>
                <Badge variant="secondary" className="mono text-[10px]">
                  {historyMissions.length} Mission{historyMissions.length > 1 ? "s" : ""} Recorded
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {historyMissions.map((m: any) => (
                  <div key={m.missionId} className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{m.missionName}</span>
                        <Badge variant={m.status === "RUNNING" ? "danger" : "secondary"} className="text-[9px]">
                          {m.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mono">
                        ID: {m.missionId?.slice(0, 18)}... · Duration: T+{Math.floor((m.duration || 0) / 60)}m {(m.duration || 0) % 60}s · {m.snapshotsCount} Snapshots · {m.eventsCount} Events · {m.faultsCount || 0} Faults
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={missionId === m.missionId ? "default" : "outline"}
                      className="text-xs h-7 gap-1"
                      onClick={() => startReplay(m.missionId)}
                    >
                      <Play className="h-3 w-3" />
                      {missionId === m.missionId ? "Replaying" : "Load & Replay"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scrubber card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between text-xs mb-3">
              <span className="text-muted-foreground mono">Mission Start — T+00:00:00</span>
              <span className="text-primary font-mono font-semibold">{playheadMET} (current playhead)</span>
              <span className="text-muted-foreground mono">
                Frame {replayFrameIndex + 1} / {totalFrames}
              </span>
            </div>

            {/* Timeline scrubber */}
            <div
              className="relative h-8 flex items-center cursor-pointer group"
              onClick={handleScrubberClick}
            >
              <div className="absolute inset-x-0 h-2 bg-muted rounded-full" />
              <div
                className="absolute left-0 h-2 bg-primary rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
              {/* Event markers */}
              {displayEvents.slice(0, 50).map((evt, idx) => {
                const markerPct = Math.min(98, (idx / Math.max(1, displayEvents.length - 1)) * 100);
                return (
                  <div
                    key={evt.id || idx}
                    title={`${evt.met}: ${evt.description}`}
                    className={cn(
                      "absolute w-1.5 h-4 rounded-sm transition-transform hover:scale-125 z-10",
                      evt.type === "anomaly" ? "bg-red-500" :
                      evt.type === "milestone" ? "bg-primary" :
                      evt.type === "operator" ? "bg-purple-500" : "bg-green-500"
                    )}
                    style={{ left: `${markerPct}%` }}
                  />
                );
              })}
              {/* Playhead thumb */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-primary border-2 border-white shadow-md z-20"
                style={{ left: `calc(${progressPct}% - 10px)` }}
              />
            </div>

            {/* Controls Toolbar */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={stepReplayPrev}
                  id="replay-skip-back"
                  title="Previous Frame (⏮)"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>

                <Button
                  variant="default"
                  size="icon"
                  className="h-10 w-10"
                  id="replay-playpause"
                  onClick={handlePlayPauseToggle}
                  title={replayStatus === "PLAYING" ? "Pause (⏸)" : "Play (▶)"}
                >
                  {replayStatus === "PLAYING" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={stopReplay}
                  id="replay-stop"
                  title="Stop Replay (⏹)"
                >
                  <Square className="h-4 w-4 fill-current" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={stepReplayNext}
                  id="replay-skip-fwd"
                  title="Next Frame (⏭)"
                >
                  <SkipForward className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => seekReplay({ frameIndex: 0 })}
                  id="replay-restart"
                  title="Restart Timeline"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              {/* Playback Speed Controls */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Speed:</span>
                {[0.5, 1, 2, 4].map(speedVal => (
                  <button
                    key={speedVal}
                    onClick={() => setReplaySpeed(speedVal)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-mono font-medium transition-colors",
                      replaySpeed === speedVal ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {speedVal}×
                  </button>
                ))}
              </div>

              <Badge variant={replayStatus === "PLAYING" ? "danger" : replayStatus === "PAUSED" ? "warning" : "secondary"} className="mono">
                {replayStatus === "PLAYING" ? "▶ REPLAY STREAMING" : replayStatus === "PAUSED" ? "⏸ REPLAY PAUSED" : "⏹ REPLAY IDLE"} · {replaySpeed}×
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Category summary cards */}
        <div className="grid grid-cols-4 gap-4">
          {(["all", "milestone", "system", "operator", "anomaly"] as const).slice(0, 4).map(catType => {
            const count = catType === "all" ? displayEvents.length : displayEvents.filter(e => e.type === catType).length;
            return (
              <button key={catType} onClick={() => setFilter(catType)}>
                <Card className={cn("cursor-pointer transition-all text-left", filter === catType && "border-primary/40 bg-primary/5")}>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground capitalize">{catType === "all" ? "All Events" : `${catType} Events`}</p>
                    <p className="text-2xl font-bold mono text-foreground">{count}</p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>

        {/* Historical Event Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Historical Mission Event Log (Supabase / Memory)</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportLogHistory}
                  className="text-xs h-7 gap-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export History
                </Button>
              </div>
              <div className="flex gap-2">
                {(["all", "milestone", "system", "operator", "anomaly"] as const).map(catType => (
                  <button
                    key={catType}
                    onClick={() => setFilter(catType)}
                    className={cn(
                      "text-[11px] font-medium px-2.5 py-1 rounded-md capitalize transition-colors",
                      filter === catType ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {catType}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="px-5 pb-5 space-y-1.5">
                {filteredEvents.map((evt, i) => {
                  const cfg = typeConfig[evt.type] ?? typeConfig.system;
                  return (
                    <motion.div
                      key={evt.id || i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className="flex gap-4 items-start p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
                      onClick={() => {
                        const parsedMet = evt.met ? parseInt(evt.met.replace("T+", "").split(":")[0]) * 60 + parseInt(evt.met.replace("T+", "").split(":")[1] || "0") : 0;
                        seekReplay({ targetTime: parsedMet });
                      }}
                    >
                      <div className={cn("h-2.5 w-2.5 rounded-full mt-1.5 shrink-0", cfg.dot)} />
                      <div className="w-24 shrink-0">
                        <p className="text-[10px] font-mono text-muted-foreground">{evt.met}</p>
                        <p className="text-[10px] text-muted-foreground">{evt.time}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground leading-relaxed">{evt.description}</p>
                        {evt.subsystem && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{evt.subsystem}</p>
                        )}
                      </div>
                      <Badge variant={cfg.badge} className="shrink-0">{cfg.label}</Badge>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
