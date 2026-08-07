import { Bell, ChevronDown, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { missionConfig } from "@/data/missionData";
import { useMissionTimer } from "@/hooks/useMissionTimer";

interface TopNavProps {
  title: string;
}

export function TopNav({ title }: TopNavProps) {
  const met = useMissionTimer(missionConfig.missionElapsedSeconds);

  return (
    <header className="fixed top-0 right-0 left-60 z-40 flex h-[57px] items-center border-b border-border bg-white/95 backdrop-blur-sm px-6">
      {/* Left: Page title + mission info */}
      <div className="flex items-center gap-6 flex-1">
        <h1 className="text-sm font-semibold text-foreground">{title}</h1>

        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="text-xs text-muted-foreground">{missionConfig.name}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="text-xs text-muted-foreground">Phase:</span>
          <Badge variant="info">{missionConfig.phase}</Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-border" />
          <span className="text-xs text-muted-foreground">MET:</span>
          <span className="text-xs font-mono font-medium text-foreground">{met}</span>
        </div>
      </div>

      {/* Right: Simulation status + Notifications + Profile */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5">
          <Circle className="h-2 w-2 fill-green-500 text-green-500 animate-pulse" />
          <span className="text-xs font-medium text-foreground">LIVE SIM</span>
        </div>

        <Button variant="ghost" size="icon" className="relative" id="notifications-btn">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger" />
        </Button>

        <button
          id="operator-profile-btn"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            SM
          </div>
          <span className="text-xs font-medium text-foreground">{missionConfig.operator}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
