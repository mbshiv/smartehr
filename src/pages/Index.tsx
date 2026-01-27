import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import PatientSidebar from "@/components/layout/PatientSidebar";
import DocumentationAssistant from "@/components/modules/DocumentationAssistant";
import BillingValidator from "@/components/modules/BillingValidator";

const Index = () => {
  const [activeModule, setActiveModule] = useState<"documentation" | "billing">("documentation");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Navigation */}
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden bg-panel">
          {activeModule === "documentation" ? (
            <DocumentationAssistant onPatientChange={setSelectedPatientId} />
          ) : (
            <BillingValidator onPatientChange={setSelectedPatientId} />
          )}
        </div>

        {/* Right Patient Sidebar */}
        <PatientSidebar selectedPatientId={selectedPatientId} />
      </main>
    </div>
  );
};

export default Index;
