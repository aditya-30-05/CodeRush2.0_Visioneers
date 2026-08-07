import { useState, useEffect } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useMissionSocket, LiveTelemetry } from "@/hooks/useMissionSocket";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";

const metrics = [
  { key: "battery", label: "Battery", unit: "%", color: "#2563EB" },
  { key: "temperature", label: "Temperature", unit: "°C", color: "#F59E0B" },
  { key: "power", label: "Power", unit: "W", color: "#16A34A" },
  { key: "storage", label: "Storage", unit: "%", color: "#8B5CF6" },
  { key: "signal", label: "Signal", unit: "dBm", color: "#06B6D4" },
];

export function Telemetry() {
  const { telemetry } = useMissionSocket();
  const [activeMetric, setActiveMetric] = useState("battery");
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (telemetry) {
      const point = {
        time: `T+${String(telemetry.missionTime).padStart(2, "0")}s`,
        battery: Math.round(telemetry.battery),
        temperature: Math.round(telemetry.temperature),
        power: Math.round(telemetry.solarGeneration || telemetry.powerGeneration || 420),
        storage: Math.round(telemetry.storagePct),
        signal: Math.round(telemetry.signalStrength),
      };
      setHistory(prev => [...prev.slice(-30), point]);
    }
  }, [telemetry]);

  const displayData = history.length > 0 ? history : [
    { time: "T+00s", battery: 95, temperature: 22, power: 420, storage: 12, signal: 92 },
    { time: "T+01s", battery: 94, temperature: 23, power: 418, storage: 14, signal: 93 },
    { time: "T+02s", battery: 93, temperature: 24, power: 415, storage: 17, signal: 91 },
  ];

  const metric = metrics.find(m => m.key === activeMetric)!;
  const values = displayData.map(d => d[activeMetric as keyof typeof d] as number);
  const current = values[values.length - 1];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return (
    <DashboardLayout title="Telemetry">
      <div className="space-y-6 max-w-[1440px]">
        {/* Summary row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Current", value: current, suffix: metric.unit },
            { label: "Peak", value: max, suffix: metric.unit },
            { label: "Minimum", value: min, suffix: metric.unit },
            { label: "Average", value: avg, suffix: metric.unit },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-2xl font-bold mono text-foreground">{s.value} <span className="text-sm font-normal text-muted-foreground">{s.suffix}</span></p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Telemetry Stream</CardTitle>
              <Tabs value={activeMetric} onValueChange={setActiveMetric}>
                <TabsList>
                  {metrics.map(m => <TabsTrigger key={m.key} value={m.key}>{m.label}</TabsTrigger>)}
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="telGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={metric.color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 8, boxShadow: "0 4px 6px -1px rgb(0 0 0/0.08)", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey={activeMetric} stroke={metric.color} strokeWidth={2} fill="url(#telGradient)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Multi-metric comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Multi-Metric Comparison</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={displayData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 12 }} />
                  {metrics.map(m => (
                    <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-3 flex-wrap">
              {metrics.map(m => (
                <div key={m.key} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
