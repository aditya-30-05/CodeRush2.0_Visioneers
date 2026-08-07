import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { AiCopilotButton } from "@/components/copilot/AiCopilotButton";
import { AiCopilotPanel } from "@/components/copilot/AiCopilotPanel";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [hasAdvisory, setHasAdvisory] = useState(false);

  return (
    <div className="min-h-screen bg-background relative">
      <Sidebar />
      <TopNav title={title} />
      <main className="ml-60 pt-[57px]">
        <div className="p-6">{children}</div>
      </main>

      {/* Global OrbitOps AI Mission Copilot */}
      <AiCopilotButton
        isOpen={isCopilotOpen}
        onToggle={() => setIsCopilotOpen(!isCopilotOpen)}
        hasAdvisory={hasAdvisory}
      />
      <AiCopilotPanel
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onHasAdvisoryChange={setHasAdvisory}
      />
    </div>
  );
}
