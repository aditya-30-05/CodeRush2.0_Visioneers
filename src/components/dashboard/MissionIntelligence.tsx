import { motion } from "framer-motion";
import { Brain, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { anomalyData } from "@/data/missionData";

const riskConfig = {
  low: "success" as const,
  medium: "warning" as const,
  high: "danger" as const,
  critical: "danger" as const,
};

export function MissionIntelligence() {
  const anomaly = anomalyData[0];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <CardTitle>Mission Intelligence</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-3">
          {/* Anomaly */}
          <div className="rounded-lg border border-red-100 bg-red-50/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
                <p className="text-xs font-semibold text-foreground">{anomaly.name}</p>
              </div>
              <Badge variant={riskConfig[anomaly.riskLevel]}>
                {anomaly.riskLevel.toUpperCase()} RISK
              </Badge>
            </div>

            {/* Confidence */}
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Detection Confidence</span>
                <span className="font-mono font-semibold text-foreground">{anomaly.confidence}%</span>
              </div>
              <Progress value={anomaly.confidence} className="h-1.5" indicatorClassName="bg-danger" />
            </div>
          </div>

          {/* Evidence */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Evidence
            </p>
            <ul className="space-y-1.5">
              {anomaly.evidence.map((e, i) => (
                <li key={i} className="flex gap-2 text-xs text-foreground">
                  <span className="text-muted-foreground shrink-0">·</span>
                  {e}
                </li>
              ))}
            </ul>
          </div>

          {/* Root Cause */}
          <div className="rounded-lg bg-muted/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Root Cause</p>
            <p className="text-xs text-foreground leading-relaxed">{anomaly.rootCause}</p>
          </div>

          {/* Recommended Procedure */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Recommended</p>
              <p className="text-xs font-semibold text-primary mono mt-0.5">{anomaly.recommendedProcedure}</p>
            </div>
            <Badge variant="info">Auto-detect</Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
