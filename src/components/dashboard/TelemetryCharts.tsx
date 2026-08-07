import { useState } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { telemetryData } from "@/data/missionData";

const metrics = [
  { key: "battery", label: "Battery", unit: "%", color: "#2563EB" },
  { key: "temperature", label: "Temperature", unit: "°C", color: "#F59E0B" },
  { key: "power", label: "Power", unit: "W", color: "#16A34A" },
  { key: "storage", label: "Storage", unit: "%", color: "#8B5CF6" },
  { key: "signal", label: "Signal", unit: "dBm", color: "#06B6D4" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-white p-3 shadow-lg">
        <p className="text-xs font-mono text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-bold text-foreground">
          {payload[0].value} {payload[0].payload.unit}
        </p>
      </div>
    );
  }
  return null;
};

export function TelemetryCharts() {
  const [activeMetric, setActiveMetric] = useState("battery");
  const metric = metrics.find((m) => m.key === activeMetric)!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Live Telemetry</CardTitle>
            <Tabs value={activeMetric} onValueChange={setActiveMetric}>
              <TabsList>
                {metrics.map((m) => (
                  <TabsTrigger key={m.key} value={m.key}>
                    {m.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id={`gradient-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metric.color} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey={activeMetric}
                  stroke={metric.color}
                  strokeWidth={2}
                  fill={`url(#gradient-${activeMetric})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
            {[
              { label: "Current", value: telemetryData[telemetryData.length - 1][activeMetric as keyof typeof telemetryData[0]], unit: metric.unit },
              { label: "Peak", value: Math.max(...telemetryData.map((d) => d[activeMetric as keyof typeof d] as number)), unit: metric.unit },
              { label: "Min", value: Math.min(...telemetryData.map((d) => d[activeMetric as keyof typeof d] as number)), unit: metric.unit },
              { label: "Avg", value: Math.round(telemetryData.reduce((s, d) => s + (d[activeMetric as keyof typeof d] as number), 0) / telemetryData.length), unit: metric.unit },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-sm font-bold mono text-foreground">{stat.value} <span className="text-xs font-normal text-muted-foreground">{stat.unit}</span></p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
