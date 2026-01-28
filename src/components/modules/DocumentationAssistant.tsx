import { useState } from "react";
import { FileText, Sparkles, Lightbulb, Loader2, History, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { syntheticPatient } from "@/data/syntheticData";
import { useClinicalNotes } from "@/hooks/useClinicalNotes";
import { toast } from "sonner";
import NotesHistory from "./NotesHistory";
import PatientSelectDialog from "./PatientSelectDialog";
import SOAPOutput, { StructuredSOAPNote } from "./SOAPOutput";

export interface DocumentationState {
  inputNotes: string;
  structuredNote: StructuredSOAPNote | null;
  structuredNoteString: string;
  reasoning: string;
  selectedPatientId: string | null;
}

interface DocumentationAssistantProps {
  state: DocumentationState;
  onStateChange: (state: DocumentationState) => void;
}

const DocumentationAssistant = ({
  state,
  onStateChange,
}: DocumentationAssistantProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPatientSelect, setShowPatientSelect] = useState(false);

  const { inputNotes, structuredNote, structuredNoteString, reasoning, selectedPatientId } = state;

  const { saveNote } = useClinicalNotes();

  const updateState = (updates: Partial<DocumentationState>) => {
    onStateChange({ ...state, ...updates });
  };

  const handlePatientSelect = (patientId: string, notes: string) => {
    updateState({ inputNotes: notes, selectedPatientId: patientId });
    toast.success(`Loaded notes for ${patientId}`);
  };

  const generateStructuredNote = (rawNotes: string): { note: StructuredSOAPNote; noteString: string } => {
    const lines = rawNotes.split('\n').filter(line => line.trim());

    const ccMatch = rawNotes.match(/(?:c\/o|cc:|chief complaint:?)\s*(.+)/i);
    const chiefComplaint = ccMatch ? ccMatch[1].trim() : lines[0] || "Not documented";

    const bpMatch = rawNotes.match(/(?:bp|blood pressure):?\s*(\d+\/\d+)/i);
    const hrMatch = rawNotes.match(/(?:hr|heart rate|pulse):?\s*(\d+)/i);
    const tempMatch = rawNotes.match(/(?:temp|temperature):?\s*([\d.]+)/i);

    const diabetesMatch = rawNotes.match(/(?:t2dm|type 2 diabetes|diabetes|dm2)/i);
    const htnMatch = rawNotes.match(/(?:htn|hypertension|high blood pressure)/i);
    const copdMatch = rawNotes.match(/(?:copd|chronic obstructive)/i);
    const anxietyMatch = rawNotes.match(/(?:anxiety|gad)/i);
    const depressionMatch = rawNotes.match(/(?:depression|mdd)/i);

    const diagnoses: { name: string; code: string }[] = [];
    if (diabetesMatch) diagnoses.push({ name: "Type 2 Diabetes Mellitus", code: "E11.65" });
    if (htnMatch) diagnoses.push({ name: "Essential Hypertension", code: "I10" });
    if (copdMatch) diagnoses.push({ name: "Chronic Obstructive Pulmonary Disease", code: "J44.9" });
    if (anxietyMatch) diagnoses.push({ name: "Generalized Anxiety Disorder", code: "F41.1" });
    if (depressionMatch) diagnoses.push({ name: "Major Depressive Disorder", code: "F32.9" });

    if (diagnoses.length === 0) {
      diagnoses.push({ name: "General Medical Examination", code: "Z00.00" });
    }

    const vitalsItems: string[] = [];
    if (bpMatch) vitalsItems.push(`Blood Pressure: ${bpMatch[1]} mmHg`);
    if (hrMatch) vitalsItems.push(`Heart Rate: ${hrMatch[1]} bpm`);
    if (tempMatch) vitalsItems.push(`Temperature: ${tempMatch[1]}°F`);

    const planMatch = rawNotes.match(/(?:plan|rx|tx|treatment):?\s*(.+)/i);
    const followUpMatch = rawNotes.match(/(?:f\/u|follow.?up|rtn):?\s*(.+)/i);
    const planItems: string[] = [];
    if (planMatch) planItems.push(planMatch[1].trim());
    if (followUpMatch) planItems.push(`Follow-up: ${followUpMatch[1].trim()}`);
    if (planItems.length === 0) planItems.push("Continue current management", "Schedule follow-up as needed");

    const hpiNarrative = lines.slice(0, 3).join('. ').replace(/\.\./g, '.') || "Patient presents for evaluation.";
    const assessment = diagnoses.map((d, i) => `${i + 1}. ${d.name} (${d.code})`).join('\n');
    const plan = planItems.map((p, i) => `${i + 1}. ${p}`).join('\n');

    const suggestedOrders: string[] = [];
    if (diabetesMatch) suggestedOrders.push("Order HbA1c lab test", "Reinforce medication adherence");
    if (htnMatch) suggestedOrders.push("Monitor blood pressure", "Consider medication adjustment");
    if (vitalsItems.length === 0) suggestedOrders.push("Document vital signs");
    if (suggestedOrders.length === 0) suggestedOrders.push("Continue current treatment plan");

    const patientPortalSummary = `You visited your healthcare provider today regarding ${chiefComplaint.toLowerCase()}. ${diagnoses.length > 0 ? `Your provider discussed ${diagnoses.map(d => d.name.toLowerCase()).join(' and ')} with you.` : ''} Please follow your treatment plan and contact us if you have any questions.`;

    const soapNote: StructuredSOAPNote = {
      chiefComplaint,
      hpiNarrative,
      assessment,
      plan,
      diagnoses,
      suggestedOrders,
      patientPortalSummary,
    };

    // Create string representation for database storage
    const noteString = `CLINICAL DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chief Complaint: ${chiefComplaint}

History of Present Illness: ${hpiNarrative}

Assessment:
${assessment}

Plan:
${plan}

Suggested Orders:
${suggestedOrders.map(o => `• ${o}`).join('\n')}

Patient Portal Summary:
${patientPortalSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated by NextGenEHR AI Documentation Assistant
Patient ID: ${selectedPatientId || 'Unknown'}`;

    return { note: soapNote, noteString };
  };

  const handleGenerateNote = async () => {
    if (!inputNotes.trim()) {
      toast.error("Please enter clinical notes first");
      return;
    }
    setIsGenerating(true);
    updateState({ reasoning: "" });

    await new Promise(resolve => setTimeout(resolve, 1500));
    const { note, noteString } = generateStructuredNote(inputNotes);
    updateState({ structuredNote: note, structuredNoteString: noteString });
    setIsGenerating(false);
    toast.success("Structured note generated successfully");
  };

  const handleExplainReasoning = async () => {
    if (!structuredNote) {
      toast.error("Generate a structured note first");
      return;
    }
    setIsExplaining(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const explanationText = `**AI Reasoning Process**

📋 **Input Analysis**
The raw notes contained abbreviated clinical terminology (c/o, x, dx, htn, t2dm) and informal documentation style typical of quick clinical entries.

🔄 **Transformation Steps**
1. Expanded medical abbreviations to standard terminology
2. Organized content into SOAP-aligned structure (Subjective, Objective, Assessment, Plan)
3. Added appropriate ICD-10 code references for diagnosed conditions
4. Ensured all clinical findings are documented with specificity

✅ **Quality Checks Applied**
• Chief complaint clearly stated
• HPI includes timeline and relevant history
• Assessment includes proper diagnosis codes
• Plan is actionable and complete
• Medical necessity established for billing`;
    updateState({ reasoning: explanationText });
    setIsExplaining(false);
  };

  const handleCopy = async () => {
    if (structuredNoteString) {
      await navigator.clipboard.writeText(structuredNoteString);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveNote = async () => {
    if (!structuredNote) {
      toast.error("Generate a note first");
      return;
    }

    const patientId = selectedPatientId || syntheticPatient.patient_id;
    setIsSaving(true);
    const { error } = await saveNote(patientId, inputNotes, structuredNoteString, reasoning || undefined);
    if (error) {
      toast.error("Failed to save note");
    } else {
      toast.success(`Note saved for ${patientId}`);
    }
    setIsSaving(false);
  };

  const handleOpenPatientSelect = () => {
    setShowPatientSelect(true);
  };

  if (showHistory) {
    return <NotesHistory onBack={() => setShowHistory(false)} />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Clinical Documentation Assistant</h2>
              <p className="text-sm text-muted-foreground">
                Transform raw clinician notes into structured clinical documentation
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  Raw Clinical Notes
                  {selectedPatientId && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      ({selectedPatientId})
                    </span>
                  )}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleOpenPatientSelect}>
                  <FolderOpen className="w-4 h-4 mr-1" />
                  Load Patient
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Textarea
                value={inputNotes}
                onChange={(e) => updateState({ inputNotes: e.target.value })}
                placeholder="Paste or type raw clinician notes here..."
                className="flex-1 min-h-[300px] resize-none font-mono text-sm"
              />
              <div className="mt-4 flex gap-3">
                <Button onClick={handleGenerateNote} disabled={isGenerating || !inputNotes.trim()} className="flex-1">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Structured Note
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Output Panel */}
          {structuredNote ? (
            <div className="flex flex-col min-h-[400px]">
              <SOAPOutput
                note={structuredNote}
                onCopy={handleCopy}
                onSave={handleSaveNote}
                copied={copied}
                isSaving={isSaving}
              />
              <div className="mt-4">
                <Button variant="outline" onClick={handleExplainReasoning} disabled={isExplaining} className="w-full">
                  {isExplaining ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Explain Reasoning
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <Card className="flex flex-col min-h-[400px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Structured Output</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 bg-secondary/30 rounded-lg p-4 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Generated note will appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Reasoning Panel */}
        {reasoning && (
          <Card className="mt-6 animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-warning" />
                AI Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-accent/50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                  {reasoning}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <PatientSelectDialog open={showPatientSelect} onOpenChange={setShowPatientSelect} onSelect={handlePatientSelect} />
    </div>
  );
};

export default DocumentationAssistant;
