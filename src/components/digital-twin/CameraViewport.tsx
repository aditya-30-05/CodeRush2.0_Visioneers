import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crosshair, Eye, Globe, ShieldCheck } from 'lucide-react';
import type { LiveTelemetry } from '@/hooks/useMissionSocket';

interface CameraViewportProps {
  telemetry: LiveTelemetry | null;
}

export function CameraViewport({ telemetry }: CameraViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const metSeconds = telemetry?.missionTime || 0;
  const lat = (Math.sin(metSeconds / 20) * 45).toFixed(4);
  const lon = (((metSeconds * 1.2) % 360) - 180).toFixed(4);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Simulated Earth Surface Curve
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height + 150, 50,
        canvas.width / 2, canvas.height + 150, 320
      );
      grad.addColorStop(0, '#1e3a8a');
      grad.addColorStop(0.5, '#0284c7');
      grad.addColorStop(0.8, '#0f172a');
      grad.addColorStop(1, '#020617');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height + 150, 320, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Coastline / Target Grid Texture Simulation
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        const r = Math.max(5, 30 + i * 35 + Math.sin(time + i) * 5);
        ctx.arc(canvas.width / 2, canvas.height / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Scanline Effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 1);
      }

      // 4. Target Crosshair Reticle
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.lineWidth = 1.5;

      // Outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, 45, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - 60, cy); ctx.lineTo(cx - 20, cy);
      ctx.moveTo(cx + 20, cy); ctx.lineTo(cx + 60, cy);
      ctx.moveTo(cx, cy - 60); ctx.lineTo(cx, cy - 20);
      ctx.moveTo(cx, cy + 20); ctx.lineTo(cx, cy + 60);
      ctx.stroke();

      // Center Dot
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <Card className="relative w-full h-[320px] bg-slate-950 border-slate-800 overflow-hidden flex flex-col justify-between p-4 shadow-2xl">
      {/* Canvas Viewport Background */}
      <canvas ref={canvasRef} width={500} height={320} className="absolute inset-0 w-full h-full object-cover" />

      {/* Top Overlay Header */}
      <div className="relative z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800">
          <Eye className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-xs font-bold text-slate-200">SPACECRAFT CAMERA VIEWPORT</span>
        </div>

        {/* Explicit Requirement #5 Badge: SIMULATED CAMERA FEED */}
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/50 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono tracking-wider">
          SIMULATED CAMERA FEED
        </Badge>
      </div>

      {/* Center Target Reticle Info Overlay */}
      <div className="relative z-10 pointer-events-none self-center text-center">
        <p className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase">TARGET: INDIA GROUND TRACK</p>
        <p className="text-[11px] font-mono text-slate-300 font-bold">LAT: {lat}° N | LON: {lon}° E</p>
      </div>

      {/* Bottom Telemetry HUD Bar */}
      <div className="relative z-10 flex items-center justify-between text-[10px] font-mono bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
        <div>ALTITUDE: <span className="text-cyan-400 font-bold">542 KM</span></div>
        <div>MODE: <span className="text-emerald-400 font-bold">EARTH OBSERVATION</span></div>
        <div>OPTICS: <span className="text-slate-200 font-bold">RGB-NIR ACTIVE</span></div>
      </div>
    </Card>
  );
}
