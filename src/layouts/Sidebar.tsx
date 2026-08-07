import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Map,
  Activity,
  Cpu,
  Zap,
  FileText,
  RotateCcw,
  ScrollText,
  Settings,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { missionConfig } from "@/data/missionData";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mission-planner", label: "Mission Planner", icon: Map },
  { to: "/telemetry", label: "Telemetry", icon: Activity },
  { to: "/digital-twin", label: "Digital Twin", icon: Cpu },
  { to: "/fault-injection", label: "Fault Injection", icon: Zap },
  { to: "/procedures", label: "Procedures", icon: FileText },
  { to: "/replay", label: "Replay", icon: RotateCcw },
  { to: "/mission-logs", label: "Mission Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-white"
    >
      {/* Logo */}
      <div className="flex h-[57px] items-center gap-2.5 px-5 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Radio className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground tracking-tight">OrbitOps</p>
          <p className="text-[10px] text-muted-foreground">Mission Control</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Operations
        </p>
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                style={isActive ? { backgroundColor: "rgba(37,99,235,0.07)" } : {}}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "")} />
                {item.label}
                {item.to === "/" && (
                  <Badge variant="danger" className="ml-auto">2</Badge>
                )}
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      <Separator />

      {/* Mission Status Card */}
      <div className="p-4">
        <div className="rounded-xl border border-border bg-muted/50 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Current Mission</p>
            <Badge variant="success">LIVE SIM</Badge>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Mission</span>
              <span className="font-mono font-medium text-foreground">{missionConfig.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Phase</span>
              <span className="font-medium text-foreground">{missionConfig.phase}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">MET</span>
              <span className="font-mono font-medium text-primary">{missionConfig.met}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Operator</span>
              <span className="font-medium text-foreground">{missionConfig.operator}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
