import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { missionEvents } from "@/data/missionData";

const typeConfig = {
  milestone: { dot: "bg-primary", badge: "info" as const },
  system: { dot: "bg-green-500", badge: "success" as const },
  operator: { dot: "bg-purple-500", badge: "default" as const },
  anomaly: { dot: "bg-red-500 animate-pulse", badge: "danger" as const },
};

export function ReplayTimeline() {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(72);

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
              <CardTitle>Replay Timeline</CardTitle>
            </div>
            <Badge variant="info">T+09:51:10</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-3">
          {/* Scrubber */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground mono">T+00:00:00</span>
              <span className="text-foreground mono font-medium">T+09:51:10</span>
              <span className="text-muted-foreground mono">T+18:30:00</span>
            </div>
            <div className="relative">
              <Progress value={progress} className="h-2 cursor-pointer" />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-primary border-2 border-white shadow-md cursor-pointer"
                style={{ left: `calc(${progress}% - 8px)` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" id="replay-skip-back"><SkipBack className="h-4 w-4" /></Button>
            <Button
              variant="default"
              size="icon"
              className="h-10 w-10"
              id="replay-play-pause"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" id="replay-skip-forward"><SkipForward className="h-4 w-4" /></Button>
            <div className="ml-4 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Speed:</span>
              {["1×", "2×", "4×"].map((s) => (
                <button
                  key={s}
                  className="rounded px-1.5 py-0.5 hover:bg-muted font-mono text-[11px] font-medium text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Event log */}
          <ScrollArea className="h-[220px] -mx-1 px-1">
            <div className="space-y-1">
              {missionEvents.map((evt) => {
                const config = typeConfig[evt.type];
                return (
                  <div
                    key={evt.id}
                    className="flex gap-3 items-start rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors cursor-pointer"
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
