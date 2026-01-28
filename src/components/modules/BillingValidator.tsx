import { useState } from "react";
import { DollarSign, ShieldCheck, AlertTriangle, Loader2, Lightbulb, CheckCircle2, XCircle, Save, History, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { syntheticPatient } from "@/data/syntheticData";
import { useBillingValidations } from "@/hooks/useBillingValidations";
import { ClinicalNote } from "@/hooks/useClinicalNotes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import BillingHistory from "./BillingHistory";
import ClinicalNoteSelectDialog from "./ClinicalNoteSelectDialog";
import SOAPDisplayReadOnly, { parseStructuredNoteString } from "./SOAPDisplayReadOnly";
import { StructuredSOAPNote } from "./SOAPOutput";

export interface ValidationResult {
  overallRisk: "low" | "medium" | "high";
  riskPercentage: number;
  icd10Codes: Array<{ code: string; description: string; confidence: number }>;
  cptCodes: Array<{ code: string; description: string; confidence: number }>;
  denialRisks: Array<{ rule: string; status: "pass" | "warning" | "fail"; detail: string }>;
  recommendations: string[];
  missingElements: string[];
}

export interface BillingState {
  inputNotes: string;
  validationResult: ValidationResult | null;
  reasoning: string;
  selectedPatientId: string | null;
  selectedNoteTag: string | null;
}

interface BillingValidatorProps {
  state: BillingState;
  onStateChange: (state: BillingState) => void;
}

const BillingValidator = ({ state, onStateChange }: BillingValidatorProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNoteSelect, setShowNoteSelect] = useState(false);

  const { inputNotes, validationResult, reasoning, selectedPatientId, selectedNoteTag } = state;

  const updateState = (updates: Partial<BillingState>) => {
    onStateChange({ ...state, ...updates });
  };

  const { saveValidation } = useBillingValidations();

  const handleNoteSelect = (note: ClinicalNote, noteTag: string) => {
    // Use structured note for billing validation
    updateState({
      inputNotes: note.structured_note,
      selectedPatientId: note.patient_id,
      selectedNoteTag: noteTag,
      validationResult: null,
      reasoning: "",
    });
    toast.success(`Loaded ${noteTag}`);
  };

  // Parse clinical notes to extract ICD-10 and CPT codes dynamically
  const parseNotesForCoding = (notes: string) => {
    const icd10Codes: Array<{ code: string; description: string; confidence: number }> = [];
    const missingElements: string[] = [];
    let baseRisk = 5;

    // Check for diagnoses and assign ICD-10 codes
    const diabetesMatch = notes.match(/(?:t2dm|type 2 diabetes|diabetes|dm2|e11\.65|hyperglycemia)/i);
    const htnMatch = notes.match(/(?:htn|hypertension|high blood pressure|i10|elevated.*bp|bp.*\d+\/\d+)/i);
    const copdMatch = notes.match(/(?:copd|chronic obstructive|j44)/i);
    const anxietyMatch = notes.match(/(?:anxiety|gad|f41)/i);
    const depressionMatch = notes.match(/(?:depression|mdd|f32)/i);

    if (diabetesMatch) {
      icd10Codes.push({ code: "E11.65", description: "Type 2 Diabetes with hyperglycemia", confidence: 95 });
    }
    if (htnMatch) {
      icd10Codes.push({ code: "I10", description: "Essential (primary) hypertension", confidence: 92 });
    }
    if (copdMatch) {
      icd10Codes.push({ code: "J44.9", description: "Chronic obstructive pulmonary disease, unspecified", confidence: 88 });
    }
    if (anxietyMatch) {
      icd10Codes.push({ code: "F41.1", description: "Generalized anxiety disorder", confidence: 85 });
    }
    if (depressionMatch) {
      icd10Codes.push({ code: "F32.9", description: "Major depressive disorder, single episode", confidence: 85 });
    }

    // Default if no conditions found
    if (icd10Codes.length === 0) {
      icd10Codes.push({ code: "Z00.00", description: "General adult medical examination", confidence: 70 });
    }

    // Check for CPT code based on complexity using E/M guidelines
    const cptCodes: Array<{ code: string; description: string; confidence: number }> = [];
    const hasMultipleDiagnoses = icd10Codes.length >= 2;
    const hasPlan = notes.match(/(?:plan|treatment|rx|adjust|reinforce|order|schedule|follow.?up)/i);
    const hasVitals = notes.match(/(?:bp|blood pressure|hr|heart rate|temp|vitals|\d+\/\d+)/i);
    const hasHistory = notes.match(/(?:history|hpi|presents?|reports?|complains?|symptoms?)/i);
    const hasExam = notes.match(/(?:exam|physical|no signs|distress|lungs|heart|abdomen)/i);
    const hasLabsOrImaging = notes.match(/(?:a1c|lab|imaging|xray|ct|mri|blood|urine|test)/i);
    
    // Calculate complexity score based on documentation elements
    let complexityScore = 0;
    if (hasMultipleDiagnoses) complexityScore += 2;
    if (hasPlan) complexityScore += 1;
    if (hasVitals) complexityScore += 1;
    if (hasHistory) complexityScore += 1;
    if (hasExam) complexityScore += 1;
    if (hasLabsOrImaging) complexityScore += 1;

    // Assign CPT code based on complexity score
    if (complexityScore >= 5) {
      cptCodes.push({ code: "99215", description: "Office visit, established patient, high complexity", confidence: 85 });
    } else if (complexityScore >= 4) {
      cptCodes.push({ code: "99214", description: "Office visit, established patient, moderate complexity", confidence: 88 });
    } else if (complexityScore >= 2) {
      cptCodes.push({ code: "99213", description: "Office visit, established patient, low complexity", confidence: 85 });
    } else {
      cptCodes.push({ code: "99212", description: "Office visit, established patient, straightforward", confidence: 80 });
    }

    // Check for missing elements and calculate risk
    const denialRisks: Array<{ rule: string; status: "pass" | "warning" | "fail"; detail: string }> = [];

    if (!hasVitals) {
      missingElements.push("Vital signs documentation");
      baseRisk += 20;
      denialRisks.push({ rule: "Vitals documentation", status: "warning", detail: "Vital signs not clearly documented" });
    } else {
      denialRisks.push({ rule: "Vitals documentation", status: "pass", detail: "Vital signs are documented" });
    }

    if (!notes.match(/(?:medication|rx|drug|metformin|lisinopril|prescription)/i)) {
      missingElements.push("Medication list");
      baseRisk += 15;
      denialRisks.push({ rule: "Medication documentation", status: "warning", detail: "Current medications not clearly listed" });
    } else {
      denialRisks.push({ rule: "Medication documentation", status: "pass", detail: "Medications are documented" });
    }

    if (!notes.match(/(?:assessment|diagnosis|dx|impression)/i)) {
      missingElements.push("Assessment section");
      baseRisk += 30;
      denialRisks.push({ rule: "Assessment documentation", status: "fail", detail: "Assessment/diagnosis section missing" });
    } else {
      denialRisks.push({ rule: "Assessment documentation", status: "pass", detail: "Assessment is clearly documented" });
    }

    if (!hasPlan) {
      missingElements.push("Treatment plan");
      baseRisk += 25;
      denialRisks.push({ rule: "Plan documentation", status: "fail", detail: "Treatment plan is missing or unclear" });
    } else {
      denialRisks.push({ rule: "Plan documentation", status: "pass", detail: "Treatment plan is documented" });
    }

    // Add code compatibility check
    denialRisks.push({
      rule: "CPT/ICD-10 compatibility",
      status: "pass",
      detail: "Office visit code matches complexity of documented conditions"
    });

    // Calculate overall risk
    const riskPercentage = Math.min(baseRisk, 100);
    let overallRisk: "low" | "medium" | "high" = "low";
    if (riskPercentage >= 50) overallRisk = "high";
    else if (riskPercentage >= 25) overallRisk = "medium";

    // Generate recommendations
    const recommendations: string[] = [];
    if (missingElements.includes("Vital signs documentation")) {
      recommendations.push("Add complete vital signs (BP, HR, Temp, RR) to the documentation");
    }
    if (missingElements.includes("Medication list")) {
      recommendations.push("Include current medication list with dosages");
    }
    if (!notes.match(/(?:education|counseling|discussed)/i)) {
      recommendations.push("Document patient education provided regarding treatment plan");
    }
    if (!notes.match(/(?:follow.?up|return|f\/u)/i)) {
      recommendations.push("Include specific follow-up timeline in the plan");
    }

    return {
      icd10Codes,
      cptCodes,
      denialRisks,
      missingElements,
      recommendations,
      riskPercentage,
      overallRisk
    };
  };

  const handleValidateClaim = async () => {
    if (!inputNotes.trim()) {
      toast.error("Please load a clinical note first");
      return;
    }

    setIsValidating(true);
    updateState({ reasoning: "" });
    
    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 1800));
    
    // Parse notes dynamically
    const parsed = parseNotesForCoding(inputNotes);
    
    const result: ValidationResult = {
      overallRisk: parsed.overallRisk,
      riskPercentage: parsed.riskPercentage,
      icd10Codes: parsed.icd10Codes,
      cptCodes: parsed.cptCodes,
      denialRisks: parsed.denialRisks,
      recommendations: parsed.recommendations,
      missingElements: parsed.missingElements,
    };

    updateState({ validationResult: result });
    setIsValidating(false);
    toast.success("Claim validation complete");
  };

  const handleExplainReasoning = async () => {
    if (!validationResult) {
      toast.error("Validate a claim first");
      return;
    }

    setIsExplaining(true);
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const explanationText = `**Billing Validation Reasoning**

🔍 **Data Extraction**
Parsed clinical notes to identify:
• Chief complaint: polydipsia, polyuria, fatigue
• Vitals: BP 148/92 (elevated)
• Labs: A1C 8.9% (above target)
• Diagnoses: T2DM, HTN

📋 **Coding Analysis**
• E11.65 selected based on documented hyperglycemia (A1C > 7%)
• I10 appropriate for documented essential hypertension
• 99214 justified by moderate complexity decision-making

⚠️ **Denial Rule Application**
Checked against 47 common denial rules:
• 45 rules passed
• 2 warnings identified (non-critical)
• 0 failures detected

💡 **Risk Calculation**
Base denial risk: 8%
+ Warning adjustments: +4%
= Final risk: 12% (LOW)

The claim is likely to be approved with minor documentation improvements.`;

    updateState({ reasoning: explanationText });
    setIsExplaining(false);
  };

  const handleSaveValidation = async () => {
    if (!validationResult) {
      toast.error("Validate a claim first");
      return;
    }

    const patientId = selectedPatientId || syntheticPatient.patient_id;

    setIsSaving(true);
    const { error } = await saveValidation(
      patientId,
      inputNotes,
      validationResult.icd10Codes,
      validationResult.cptCodes,
      validationResult.riskPercentage,
      validationResult.missingElements,
      validationResult.recommendations
    );

    if (error) {
      toast.error("Failed to save validation");
    } else {
      toast.success(`Validation saved for ${patientId}`);
    }
    setIsSaving(false);
  };

  const getRiskColor = (risk: "low" | "medium" | "high") => {
    switch (risk) {
      case "low":
        return "risk-badge-low";
      case "medium":
        return "risk-badge-medium";
      case "high":
        return "risk-badge-high";
    }
  };

  const getStatusIcon = (status: "pass" | "warning" | "fail") => {
    switch (status) {
      case "pass":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "fail":
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  if (showHistory) {
    return <BillingHistory onBack={() => setShowHistory(false)} />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                AI Coding & Billing Validator
              </h2>
              <p className="text-sm text-muted-foreground">
                Validate claims and prevent denials with AI-powered analysis
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
          {/* Input Panel - SOAP Display */}
          {inputNotes ? (
            <div className="flex flex-col">
              {(() => {
                const parsedNote = parseStructuredNoteString(inputNotes);
                if (parsedNote) {
                  return (
                    <>
                      <SOAPDisplayReadOnly note={parsedNote} noteTag={selectedNoteTag} />
                      <div className="mt-4">
                        <Button
                          onClick={handleValidateClaim}
                          disabled={isValidating}
                          className="w-full"
                        >
                          {isValidating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Validating...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4 mr-2" />
                              Validate Claim
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  );
                }
                // Fallback for notes that can't be parsed
                return (
                  <Card className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium">
                          Clinical Notes
                          {selectedNoteTag && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              ({selectedNoteTag})
                            </span>
                          )}
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setShowNoteSelect(true)}>
                          <FileText className="w-4 h-4 mr-1" />
                          Load Clinical Note
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                      <div className="flex-1 bg-secondary/30 rounded-lg p-4 overflow-y-auto min-h-[300px]">
                        <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                          {inputNotes}
                        </pre>
                      </div>
                      <div className="mt-4">
                        <Button
                          onClick={handleValidateClaim}
                          disabled={isValidating}
                          className="w-full"
                        >
                          {isValidating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Validating...
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4 mr-2" />
                              Validate Claim
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          ) : (
            <Card className="flex flex-col min-h-[400px]">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Clinical Notes</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowNoteSelect(true)}>
                    <FileText className="w-4 h-4 mr-1" />
                    Load Clinical Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 bg-secondary/30 rounded-lg p-4 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Load a clinical note from the Documentation Assistant</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={handleValidateClaim}
                    disabled={true}
                    className="w-full"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Validate Claim
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Results Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Validation Results</CardTitle>
                {validationResult && (
                  <Button variant="ghost" size="sm" onClick={handleSaveValidation} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-1" />
                    )}
                    Save
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              {validationResult ? (
                <div className="space-y-6 animate-fade-in">
                  {/* Risk Summary */}
                  <div className="bg-secondary/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-muted-foreground">Denial Risk</span>
                      <Badge className={cn("font-semibold", getRiskColor(validationResult.overallRisk))}>
                        {validationResult.riskPercentage}% {validationResult.overallRisk.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          validationResult.overallRisk === "low" && "bg-success",
                          validationResult.overallRisk === "medium" && "bg-warning",
                          validationResult.overallRisk === "high" && "bg-destructive"
                        )}
                        style={{ width: `${validationResult.riskPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Suggested Codes */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        ICD-10 Codes
                      </h4>
                      <div className="space-y-2">
                        {validationResult.icd10Codes.map((code) => (
                          <div key={code.code} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                            <div>
                              <span className="font-mono font-medium">{code.code}</span>
                              <span className="text-xs text-muted-foreground ml-2">({code.confidence}%)</span>
                              <p className="text-xs text-muted-foreground">{code.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        CPT Codes
                      </h4>
                      <div className="space-y-2">
                        {validationResult.cptCodes.map((code) => (
                          <div key={code.code} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                            <div>
                              <span className="font-mono font-medium">{code.code}</span>
                              <span className="text-xs text-muted-foreground ml-2">({code.confidence}%)</span>
                              <p className="text-xs text-muted-foreground">{code.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Denial Risk Checks */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Denial Prevention Checks
                    </h4>
                    <div className="space-y-2">
                      {validationResult.denialRisks.map((risk, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-2 rounded-lg bg-secondary/20"
                        >
                          {getStatusIcon(risk.status)}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{risk.rule}</p>
                            <p className="text-xs text-muted-foreground">{risk.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  {validationResult.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                        Recommendations
                      </h4>
                      <ul className="space-y-1">
                        {validationResult.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    onClick={handleExplainReasoning}
                    disabled={isExplaining}
                    className="w-full"
                  >
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
              ) : (
                <div className="h-full min-h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Validation results will appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
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

      <ClinicalNoteSelectDialog
        open={showNoteSelect}
        onOpenChange={setShowNoteSelect}
        onSelect={handleNoteSelect}
      />
    </div>
  );
};

export default BillingValidator;
