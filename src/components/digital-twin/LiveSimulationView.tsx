import React, { useState } from 'react';
import { Spacecraft3D, SubsystemComponentId } from './Spacecraft3D';
import { SpacecraftComponent } from './SpacecraftComponent';
import { FaultOverlay } from './FaultOverlay';
import { CameraViewport } from './CameraViewport';
import { CameraPayload } from './CameraPayload';
import type { LiveTelemetry } from '@/hooks/useMissionSocket';

interface LiveSimulationViewProps {
  telemetry: LiveTelemetry | null;
  activeFaults: string[];
}

export function LiveSimulationView({ telemetry, activeFaults }: LiveSimulationViewProps) {
  const [selectedComponent, setSelectedComponent] = useState<SubsystemComponentId | null>('battery');

  return (
    <div className="space-y-6">
      {/* 3D Model + Subsystem Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Spacecraft3D
            telemetry={telemetry}
            activeFaults={activeFaults}
            selectedComponent={selectedComponent}
            onSelectComponent={setSelectedComponent}
          />
        </div>
        <div className="lg:col-span-1">
          <SpacecraftComponent
            selectedComponent={selectedComponent}
            telemetry={telemetry}
            activeFaults={activeFaults}
          />
        </div>
      </div>

      {/* Fault Diagnostics Overlay */}
      {activeFaults.length > 0 && (
        <FaultOverlay
          activeFaults={activeFaults}
          selectedComponent={selectedComponent}
        />
      )}

      {/* Camera Payload Optics + HUD Viewport Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CameraViewport telemetry={telemetry} />
        <CameraPayload telemetry={telemetry} />
      </div>
    </div>
  );
}
