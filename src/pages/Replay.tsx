import { useState } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { missionEvents } from "@/data/missionData";

const typeConfig = {
  milestone: { dot: "bg-primary", badge: "info" as const, label: "Milestone" },
  system: { dot: "bg-green-500", badge: "success" as const, label: "System" },
  operator: { dot: "bg-purple-500", badge: "default" as const, label: "Operator" },
  anomaly: { dot: "bg-red-500 animate-pulse", badge: "danger" as const, label: "Anomaly" },
};

export function Replay() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(54);
  const [speed, setSpeed] = useState("1×");
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? missionEvents : missionEvents.filter(e => e.type === filter);

  return (
    <DashboardLayout title="Replay">
      <div className="max-w-[1440px] space-y-5">

        {/* Scrubber card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex justify-between text-xs mb-3">
              <span className="text-muted-foreground mono">Mission Start — T+00:00:00</span>
              <span className="text-primary font-mono font-semibold">T+09:51:10 (current playhead)</span>
              <span className="text-muted-foreground mono">T+18:30:00 — Mission End</span>
            </div>

            {/* Timeline scrubber */}
            <div className="relative h-8 flex items-center">
              <div className="absolute inset-x-0 h-2 bg-muted rounded-full" />
              <div
                className="absolute left-0 h-2 bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
              {/* Event markers */}
              {missionEvents.map(evt => {
                const pct = (parseInt(evt.met.replace("T+", "").split(":").reduce((acc, v, i) => acc + (parseInt(v) * [3600, 60, 1][i]).toString(), "0")) / 66600) * 100;
                return (
                  <div
                    key={evt.id}
                    title={evt.description}
                    className={cn("absolute w-1.5 h-4 rounded-sm cursor-pointer",
                      evt.type === "anomaly" ? "bg-red-500" :
                      evt.type === "milestone" ? "bg-primary" :
                      evt.type === "operator" ? "bg-purple-500" : "bg-green-500"
                    )}
                    style={{ left: `${Math.min(pct, 96)}%` }}
                  />
                );
              })}
              {/* Playhead */}
              <div
                className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-primary border-2 border-white shadow-md cursor-grab z-10"
                style={{ left: `calc(${progress}% - 10px)` }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setProgress(p => Math.max(0, p - 10))} id="replay-skip-back">
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className="h-10 w-10"
                  id="replay-playpause"
                  onClick={() => setPlaying(p => !p)}
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setProgress(p => Math.min(100, p + 10))} id="replay-skip-fwd">
                  <SkipForward className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setProgress(0); setPlaying(false); }} id="replay-restart">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Speed:</span>
                {["0.5×", "1×", "2×", "4×"].map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-mono font-medium transition-colors",
                      speed === s ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <Badge variant="info" className="mono">
                {playing ? "▶ PLAYING" : "⏸ PAUSED"} · {speed}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Events grid */}
        <div className="grid grid-cols-4 gap-4">
          {(["all", "milestone", "system", "operator", "anomaly"] as const).slice(0, 4).map(type => {
            const count = type === "all" ? missionEvents.length : missionEvents.filter(e => e.type === type).length;
            return (
              <button key={type} onClick={() => setFilter(type)}>
                <Card className={cn("cursor-pointer transition-all text-left", filter === type && "border-primary/40 bg-primary/5")}>
                  <CardContent className="pt-5">
                    <p className="text-xs text-muted-foreground capitalize">{type === "all" ? "All Events" : `${type} Events`}</p>
                    <p className="text-2xl font-bold mono text-foreground">{count}</p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>

        {/* Event log */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Mission Event Log</CardTitle>
              <div className="flex gap-2">
                {(["all", "milestone", "system", "operator", "anomaly"] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={cn(
                      "text-[11px] font-medium px-2.5 py-1 rounded-md capitalize transition-colors",
                      filter === type ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="px-5 pb-5 space-y-1.5">
                {filtered.map((evt, i) => {
                  const cfg = typeConfig[evt.type];
                  return (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex gap-4 items-start p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
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
