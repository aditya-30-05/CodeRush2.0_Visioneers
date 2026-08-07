import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Play, Square, RefreshCw, Aperture, MapPin, Eye, CheckCircle } from 'lucide-react';
import type { LiveTelemetry } from '@/hooks/useMissionSocket';

interface CameraPayloadProps {
  telemetry: LiveTelemetry | null;
}

export function CameraPayload({ telemetry }: CameraPayloadProps) {
  const [imagingState, setImagingState] = useState<'ACTIVE' | 'STANDBY' | 'CAPTURING'>('ACTIVE');
  const [lastCapture, setLastCapture] = useState<string>('T+00:12:04');
  const [target, setTarget] = useState<string>('INDIA (ISRO SHAR Track)');

  const metSeconds = telemetry?.missionTime || 0;
  const metStr = `T+${Math.floor(metSeconds / 3600).toString().padStart(2, '0')}:${Math.floor((metSeconds % 3600) / 60).toString().padStart(2, '0')}:${Math.floor(metSeconds % 60).toString().padStart(2, '0')}`;

  const handleCapture = () => {
    setImagingState('CAPTURING');
    setLastCapture(metStr);
    setTimeout(() => {
      setImagingState('ACTIVE');
    }, 1500);
  };

  const handleStartImaging = () => setImagingState('ACTIVE');
  const handleStopImaging = () => setImagingState('STANDBY');
  const handleResetCamera = () => {
    setTarget('INDIA (ISRO SHAR Track)');
    setImagingState('ACTIVE');
  };

  return (
    <Card className="bg-slate-900/80 border-slate-800 p-5 shadow-xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Camera / Imaging Payload</h3>
              <p className="text-[11px] text-slate-400">Earth Observation Sensor Optics</p>
            </div>
          </div>
          <Badge
            variant={imagingState === 'ACTIVE' ? 'success' : imagingState === 'CAPTURING' ? 'warning' : 'secondary'}
          >
            {imagingState}
          </Badge>
        </div>

        {/* Telemetry Status Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <p className="text-[10px] text-slate-400 uppercase">Imaging Mode</p>
            <p className="text-xs font-mono font-semibold text-cyan-300 mt-0.5">
              {telemetry?.activity === 'Observation' ? 'EARTH OBSERVATION' : telemetry?.activity === 'Rotate' ? 'TARGET POINTING' : 'CALIBRATION'}
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <p className="text-[10px] text-slate-400 uppercase">Resolution</p>
            <p className="text-xs font-mono font-semibold text-slate-200 mt-0.5">1920 × 1080 (HD GSD)</p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <p className="text-[10px] text-slate-400 uppercase">Capture Status</p>
            <p className="text-xs font-mono font-semibold text-emerald-400 mt-0.5">
              {imagingState === 'CAPTURING' ? 'ACQUIRING FRAME...' : 'READY'}
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <p className="text-[10px] text-slate-400 uppercase">Last Capture MET</p>
            <p className="text-xs font-mono font-semibold text-slate-300 mt-0.5">{lastCapture}</p>
          </div>

          <div className="col-span-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase">Target Track</p>
              <p className="text-xs font-semibold text-cyan-300 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan-400" />
                {target}
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-400">ALT: 542 KM</span>
          </div>
        </div>
      </div>

      {/* Payload Control Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          onClick={handleCapture}
          disabled={imagingState === 'CAPTURING'}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs gap-1.5"
        >
          <Aperture className="w-3.5 h-3.5" />
          Capture Image
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={imagingState === 'ACTIVE' ? handleStopImaging : handleStartImaging}
          className="border-slate-700 hover:bg-slate-800 text-slate-200 text-xs gap-1.5"
        >
          {imagingState === 'ACTIVE' ? (
            <>
              <Square className="w-3.5 h-3.5 text-amber-400" />
              Stop Imaging
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              Start Imaging
            </>
          )}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleResetCamera}
          className="col-span-2 text-slate-400 hover:text-white text-xs gap-1 h-7"
        >
          <RefreshCw className="w-3 h-3" />
          Reset Camera Optics & Target Vector
        </Button>
      </div>
    </Card>
  );
}
