import { useState, useMemo, useEffect, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import PatientSidebar from "@/components/layout/PatientSidebar";
import DocumentationAssistant from "@/components/modules/DocumentationAssistant";
import BillingValidator from "@/components/modules/BillingValidator";
import QueryAssistant from "@/components/modules/QueryAssistant";
import { DocumentationState } from "@/components/modules/DocumentationAssistant";
import { BillingState } from "@/components/modules/BillingValidator";
import { QueryAssistantState } from "@/components/modules/QueryAssistant";
import { useAuthContext } from "@/contexts/AuthContext";

const DOC_STATE_KEY = "nextgenehr_doc_state";
const BILLING_STATE_KEY = "nextgenehr_billing_state";
const QUERY_STATE_KEY = "nextgenehr_query_state";

const defaultDocState: DocumentationState = {
  inputNotes: "",
  structuredNote: null,
  structuredNoteString: "",
  reasoning: "",
  selectedPatientId: null,
};

const defaultBillingState: BillingState = {
  inputNotes: "",
  validationResult: null,
  reasoning: "",
  selectedPatientId: null,
  selectedNoteTag: null,
};

const defaultQueryState: QueryAssistantState = {
  messages: [],
};

function loadState<T>(key: string, userId: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${key}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

const Index = () => {
  const { user } = useAuthContext();
  const userId = user?.id ?? "";

  const [activeModule, setActiveModule] = useState<"documentation" | "billing" | "query">("documentation");

  const [docState, setDocState] = useState<DocumentationState>(() =>
    userId ? loadState(DOC_STATE_KEY, userId, defaultDocState) : defaultDocState
  );

  const [billingState, setBillingState] = useState<BillingState>(() =>
    userId ? loadState(BILLING_STATE_KEY, userId, defaultBillingState) : defaultBillingState
  );

  // Restore state when user logs in
  useEffect(() => {
    if (userId) {
      setDocState(loadState(DOC_STATE_KEY, userId, defaultDocState));
      setBillingState(loadState(BILLING_STATE_KEY, userId, defaultBillingState));
    }
  }, [userId]);

  // Persist doc state
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`${DOC_STATE_KEY}_${userId}`, JSON.stringify(docState));
    }
  }, [docState, userId]);

  // Persist billing state
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`${BILLING_STATE_KEY}_${userId}`, JSON.stringify(billingState));
    }
  }, [billingState, userId]);

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
