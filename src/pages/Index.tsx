import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import PatientSidebar from "@/components/layout/PatientSidebar";
import DocumentationAssistant from "@/components/modules/DocumentationAssistant";
import BillingValidator from "@/components/modules/BillingValidator";

// Lifted state types for persistence across module switches
interface DocumentationState {
  inputNotes: string;
  structuredNote: string;
  reasoning: string;
  selectedPatientId: string | null;
}

interface BillingState {
  inputNotes: string;
  validationResult: any | null;
  reasoning: string;
  selectedPatientId: string | null;
  selectedNoteTag: string | null;
}

const Index = () => {
  const [activeModule, setActiveModule] = useState<"documentation" | "billing">("documentation");
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Lifted documentation state
  const [docState, setDocState] = useState<DocumentationState>({
    inputNotes: "",
    structuredNote: "",
    reasoning: "",
    selectedPatientId: null,
  });

  // Lifted billing state
  const [billingState, setBillingState] = useState<BillingState>({
    inputNotes: "",
    validationResult: null,
    reasoning: "",
    selectedPatientId: null,
    selectedNoteTag: null,
  });

  const handlePatientChange = (patientId: string | null) => {
    setSelectedPatientId(patientId);
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Navigation */}
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden bg-panel">
          {activeModule === "documentation" ? (
            <DocumentationAssistant
              onPatientChange={handlePatientChange}
              state={docState}
              onStateChange={setDocState}
            />
          ) : (
            <BillingValidator
              onPatientChange={handlePatientChange}
              state={billingState}
              onStateChange={setBillingState}
            />
          )}
        </div>

        {/* Right Patient Sidebar */}
        <PatientSidebar selectedPatientId={selectedPatientId} />
      </main>
    </div>
  );
};

export default Index;
