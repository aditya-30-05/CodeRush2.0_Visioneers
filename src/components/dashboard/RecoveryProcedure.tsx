import { useState } from "react";
import { motion } from "framer-motion";
import { CheckSquare, Square, Clock, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { recoverySteps } from "@/data/missionData";

export function RecoveryProcedure() {
  const [steps, setSteps] = useState(recoverySteps);

  const completed = steps.filter((s) => s.completed).length;
  const pct = Math.round((completed / steps.length) * 100);

  const toggleStep = (id: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

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
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle>Recovery Procedure</CardTitle>
            </div>
            <Badge variant="danger">HIGH RISK</Badge>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">PROC-TH-002: Emergency Thermal Recovery</span>
              <span className="font-mono font-medium text-foreground">{pct}%</span>
            </div>
            <Progress value={pct} indicatorClassName="bg-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-3">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => toggleStep(step.id)}
              className="w-full flex items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
            >
              {step.completed ? (
                <CheckSquare className="h-4 w-4 text-success mt-0.5 shrink-0" />
              ) : (
                <Square className="h-4 w-4 text-border mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <p className={`text-xs font-medium ${step.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  <span className="mono text-muted-foreground mr-1.5">{String(step.step).padStart(2, "0")}.</span>
                  {step.description}
                </p>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                <Clock className="h-3 w-3" />
                <span className="text-[10px]">{step.estimatedTime}</span>
              </div>
            </button>
          ))}

          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="default" size="sm" className="flex-1" id="procedure-approve-btn">
              Approve
            </Button>
            <Button variant="outline" size="sm" id="procedure-preview-btn">
              Preview
            </Button>
            <Button variant="destructive" size="sm" id="procedure-reject-btn">
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
