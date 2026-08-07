import { Routes, Route } from "react-router-dom";
import { Dashboard } from "@/pages/Dashboard";
import { MissionPlanner } from "@/pages/MissionPlanner";
import { Telemetry } from "@/pages/Telemetry";
import { DigitalTwinPage } from "@/pages/DigitalTwin";
import { FaultInjectionPage } from "@/pages/FaultInjection";
import { Procedures } from "@/pages/Procedures";
import { Replay } from "@/pages/Replay";
import { MissionLogs } from "@/pages/MissionLogs";
import { Settings } from "@/pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/mission-planner" element={<MissionPlanner />} />
      <Route path="/telemetry" element={<Telemetry />} />
      <Route path="/digital-twin" element={<DigitalTwinPage />} />
      <Route path="/fault-injection" element={<FaultInjectionPage />} />
      <Route path="/procedures" element={<Procedures />} />
      <Route path="/replay" element={<Replay />} />
      <Route path="/mission-logs" element={<MissionLogs />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
