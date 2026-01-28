import { useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import PatientSidebar from "@/components/layout/PatientSidebar";
import DocumentationAssistant from "@/components/modules/DocumentationAssistant";
import BillingValidator from "@/components/modules/BillingValidator";
import { DocumentationState } from "@/components/modules/DocumentationAssistant";
import { BillingState } from "@/components/modules/BillingValidator";

const Index = () => {
  const [activeModule, setActiveModule] = useState<"documentation" | "billing">("documentation");

  // Lifted documentation state
  const [docState, setDocState] = useState<DocumentationState>({
    inputNotes: "",
    structuredNote: null,
    structuredNoteString: "",
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

  // Derive the sidebar patient ID from the active module's state
  const selectedPatientId = useMemo(() => {
    if (activeModule === "documentation") {
      return docState.selectedPatientId;
    } else {
      return billingState.selectedPatientId;
    }
  }, [activeModule, docState.selectedPatientId, billingState.selectedPatientId]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Navigation */}
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden bg-panel">
          {activeModule === "documentation" ? (
            <DocumentationAssistant
              state={docState}
              onStateChange={setDocState}
            />
          ) : (
            <BillingValidator
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
