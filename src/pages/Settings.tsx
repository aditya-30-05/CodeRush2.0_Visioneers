import { DashboardLayout } from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import { missionConfig } from "@/data/missionData";
import { Bell, Shield, Monitor, Database, Radio } from "lucide-react";

const settings = [
  {
    section: "Mission",
    icon: Monitor,
    items: [
      { label: "Mission ID", value: missionConfig.name, type: "text" },
      { label: "Operator Name", value: missionConfig.operator, type: "text" },
      { label: "Simulation Mode", value: "LIVE SIM", type: "badge-success" },
    ],
  },
  {
    section: "Alerts",
    icon: Bell,
    items: [
      { label: "Critical Alert Threshold", value: "Immediate", type: "text" },
      { label: "Warning Alert Threshold", value: "30 seconds", type: "text" },
      { label: "Sound Notifications", value: "Enabled", type: "badge-success" },
    ],
  },
  {
    section: "Telemetry",
    icon: Radio,
    items: [
      { label: "Polling Interval", value: "1 second", type: "text" },
      { label: "Data Retention", value: "72 hours", type: "text" },
      { label: "Anomaly Detection", value: "AI-Assisted", type: "badge-info" },
    ],
  },
  {
    section: "Security",
    icon: Shield,
    items: [
      { label: "Session Timeout", value: "4 hours", type: "text" },
      { label: "Audit Logging", value: "Enabled", type: "badge-success" },
      { label: "Encryption", value: "AES-256", type: "badge-success" },
    ],
  },
  {
    section: "Storage",
    icon: Database,
    items: [
      { label: "Log Storage", value: "127 GB / 2 TB", type: "text" },
      { label: "Auto-Archive", value: "After 7 days", type: "text" },
      { label: "Backup Status", value: "Synced", type: "badge-success" },
    ],
  },
];

export function Settings() {
  return (
    <DashboardLayout title="Settings">
      <div className="max-w-3xl space-y-5">
        {settings.map((group, gi) => {
          const Icon = group.icon;
          return (
            <motion.div
              key={group.section}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.09 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <CardTitle>{group.section}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-0">
                  {group.items.map((item, i) => (
                    <div key={item.label}>
                      {i > 0 && <Separator className="my-0" />}
                      <div className="flex items-center justify-between py-3.5">
                        <p className="text-sm text-foreground font-medium">{item.label}</p>
                        {item.type === "text" ? (
                          <span className="text-sm text-muted-foreground mono">{item.value}</span>
                        ) : item.type === "badge-success" ? (
                          <Badge variant="success">{item.value}</Badge>
                        ) : (
                          <Badge variant="info">{item.value}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Danger zone */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-danger">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/30">
                <div>
                  <p className="text-sm font-medium text-foreground">Reset Simulation</p>
                  <p className="text-xs text-muted-foreground">Clears all injected faults and resets telemetry to T+00:00</p>
                </div>
                <Button variant="destructive" size="sm" id="reset-sim-btn">Reset Sim</Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50/30">
                <div>
                  <p className="text-sm font-medium text-foreground">Clear All Mission Logs</p>
                  <p className="text-xs text-muted-foreground">Permanently removes all events from this session</p>
                </div>
                <Button variant="destructive" size="sm" id="clear-logs-btn">Clear Logs</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
