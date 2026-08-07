import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { MissionMetric } from "@/types/mission";

interface MetricCardProps {
  metric: MissionMetric;
  index: number;
}

const statusConfig = {
  nominal: { badge: "success" as const, label: "Nominal", bar: "bg-green-500" },
  warning: { badge: "warning" as const, label: "Warning", bar: "bg-amber-500" },
  critical: { badge: "danger" as const, label: "Critical", bar: "bg-red-500" },
  offline: { badge: "secondary" as const, label: "Offline", bar: "bg-gray-400" },
};

export function MetricCard({ metric, index }: MetricCardProps) {
  const config = statusConfig[metric.status];
  const pct = ((metric.value - metric.min) / (metric.max - metric.min)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: "easeOut" }}
    >
      <Card className="hover:card-shadow-md transition-shadow">
        <CardContent className="pt-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
            <Badge variant={config.badge}>{config.label}</Badge>
          </div>

          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-2xl font-bold text-foreground mono">
              {metric.value}
            </span>
            <span className="text-sm text-muted-foreground">{metric.unit}</span>
          </div>

          <div className="flex items-center gap-1.5 mb-3">
            {metric.trend === "up" ? (
              <TrendingUp className="h-3.5 w-3.5 text-danger" />
            ) : metric.trend === "down" ? (
              <TrendingDown className="h-3.5 w-3.5 text-success" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-xs font-medium",
                metric.trend === "up" ? "text-danger" : metric.trend === "down" ? "text-success" : "text-muted-foreground"
              )}
            >
              {metric.trendValue}% vs last hour
            </span>
          </div>

          <Progress
            value={Math.min(pct, 100)}
            className="h-1.5"
            indicatorClassName={config.bar}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
