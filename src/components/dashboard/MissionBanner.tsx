import { motion } from "framer-motion";
import { Satellite, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { missionConfig } from "@/data/missionData";
import { useMissionTimer } from "@/hooks/useMissionTimer";

export function MissionBanner() {
  const met = useMissionTimer(missionConfig.missionElapsedSeconds);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border bg-white p-5 card-shadow"
    >
      <div className="flex items-center justify-between gap-6">
        {/* Left: Mission identity */}
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Satellite className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground mono">{missionConfig.name}</h2>
              <Badge variant="success">LIVE SIM</Badge>
              <Badge variant="info">{missionConfig.phase}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">ISRO Low-Earth Orbit Observation Mission · 2026</p>
          </div>
        </div>

        {/* Center: Progress bar */}
        <div className="flex-1 max-w-xs">
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <span className="text-muted-foreground">Mission Progress</span>
            <span className="font-mono font-semibold text-foreground">{missionConfig.missionProgress}%</span>
          </div>
          <Progress value={missionConfig.missionProgress} className="h-2" />
        </div>

        {/* Right: Key stats */}
        <div className="flex items-center gap-6 divide-x divide-border">
          <div className="text-center pr-6">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
              <Clock className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide font-medium">MET</span>
            </div>
            <p className="text-sm font-bold mono text-foreground">{met}</p>
          </div>
          <div className="text-center px-6">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
              <TrendingUp className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide font-medium">Success Prob.</span>
            </div>
            <p className="text-sm font-bold mono text-foreground">{missionConfig.successProbability}%</p>
          </div>
          <div className="text-center pl-6">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
              <span className="text-[10px] uppercase tracking-wide font-medium">Status</span>
            </div>
            <p className="text-sm font-bold text-success">Nominal</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
