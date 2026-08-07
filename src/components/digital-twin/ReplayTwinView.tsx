import React, { useState } from 'react';
import { Spacecraft3D, SubsystemComponentId } from './Spacecraft3D';
import { SpacecraftComponent } from './SpacecraftComponent';
import { CameraViewport } from './CameraViewport';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, SkipBack, SkipForward, PlaySquare } from 'lucide-react';
import { useMission } from '@/context/MissionContext';

export function ReplayTwinView() {
  const mission = useMission();
  const [selectedComponent, setSelectedComponent] = useState<SubsystemComponentId | null>('battery');

  const {
    isReplaying,
    replayStatus,
    replayTelemetry,
    replayFrameIndex,
    replayTotalFrames,
    startReplay,
    pauseReplay,
    resumeReplay,
    stopReplay,
    seekReplay,
    stepReplayPrev,
    stepReplayNext,
  } = mission;

  const currentTelemetry = replayTelemetry || mission.telemetry;

  return (
    <div className="space-y-6">
      {/* Replay Stream Header Bar */}
      <Card className="bg-slate-900/90 border-slate-800 p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <PlaySquare className="w-5 h-5 text-cyan-400" />
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase">REPLAY TWIN MODE</h4>
            <p className="text-[11px] text-slate-400">
              3D Spacecraft consuming historical database stream. <span className="text-cyan-300 font-semibold font-mono">Frame {replayFrameIndex + 1} of {replayTotalFrames || 200}</span>
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={stepReplayPrev}
            className="h-8 w-8 p-0 border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          {replayStatus === 'PLAYING' ? (
            <Button size="sm" onClick={pauseReplay} className="h-8 px-3 bg-amber-600 hover:bg-amber-500 text-white gap-1.5 text-xs">
              <Pause className="w-4 h-4" /> Pause
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={replayStatus === 'PAUSED' ? resumeReplay : () => startReplay()}
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 text-xs"
            >
              <Play className="w-4 h-4" /> Play Replay
            </Button>
          )}

          <Button size="sm" variant="destructive" onClick={stopReplay} className="h-8 px-3 text-xs gap-1.5">
            <Square className="w-3.5 h-3.5" /> Stop
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={stepReplayNext}
            className="h-8 w-8 p-0 border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* 3D Model + Subsystem Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Spacecraft3D
            telemetry={currentTelemetry}
            activeFaults={currentTelemetry?.faults || []}
            selectedComponent={selectedComponent}
            onSelectComponent={setSelectedComponent}
          />
        </div>
        <div className="lg:col-span-1">
          <SpacecraftComponent
            selectedComponent={selectedComponent}
            telemetry={currentTelemetry}
            activeFaults={currentTelemetry?.faults || []}
          />
        </div>
      </div>

      {/* Replay Camera Viewport */}
      <CameraViewport telemetry={currentTelemetry} />
    </div>
  );
}
