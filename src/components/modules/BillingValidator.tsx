import { useState } from "react";
import { DollarSign, ShieldCheck, AlertTriangle, Loader2, Lightbulb, CheckCircle2, XCircle, Save, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { syntheticEncounterNote, syntheticPatient } from "@/data/syntheticData";
import { useBillingValidations } from "@/hooks/useBillingValidations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import BillingHistory from "./BillingHistory";

interface ValidationResult {
  overallRisk: "low" | "medium" | "high";
  riskPercentage: number;
  icd10Codes: Array<{ code: string; description: string; confidence: number }>;
  cptCodes: Array<{ code: string; description: string; confidence: number }>;
  denialRisks: Array<{ rule: string; status: "pass" | "warning" | "fail"; detail: string }>;
  recommendations: string[];
  missingElements: string[];
}

const BillingValidator = () => {
  const [inputNotes, setInputNotes] = useState(syntheticEncounterNote);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [reasoning, setReasoning] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { saveValidation } = useBillingValidations();

  const handleValidateClaim = async () => {
    if (!inputNotes.trim()) {
      toast.error("Please enter clinical notes first");
      return;
    }

    setIsValidating(true);
    setReasoning("");
    
    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 1800));
    
    const result: ValidationResult = {
      overallRisk: "low",
      riskPercentage: 12,
      icd10Codes: [
        { code: "E11.65", description: "Type 2 Diabetes with hyperglycemia", confidence: 95 },
        { code: "I10", description: "Essential (primary) hypertension", confidence: 92 },
      ],
      cptCodes: [
        { code: "99214", description: "Office visit, established patient, moderate complexity", confidence: 88 },
      ],
      denialRisks: [
        { rule: "Medical necessity documented", status: "pass", detail: "Clear symptoms and clinical findings support diagnosis" },
        { rule: "Code specificity check", status: "pass", detail: "ICD-10 codes are specific to 5th character level" },
        { rule: "CPT/ICD-10 compatibility", status: "pass", detail: "Office visit code matches complexity of documented conditions" },
        { rule: "Plan documentation", status: "warning", detail: "Plan is present but could include more specific medication details" },
      ],
      recommendations: [
        "Consider adding specific Metformin dosage in the plan section",
        "Document patient education provided regarding medication adherence",
        "Include follow-up timeline explicitly in the assessment",
      ],
      missingElements: [
        "Specific medication dosage",
        "Patient education documentation",
      ],
    };

    setValidationResult(result);
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

    setReasoning(explanationText);
    setIsExplaining(false);
  };

  const handleSaveValidation = async () => {
    if (!validationResult) {
      toast.error("Validate a claim first");
      return;
    }

    setIsSaving(true);
    const { error } = await saveValidation(
      syntheticPatient.patient_id,
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
      toast.success("Validation saved to your history");
    }
    setIsSaving(false);
  };

  const handleLoadSample = () => {
    setInputNotes(syntheticEncounterNote);
    toast.info("Sample encounter note loaded");
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
          {/* Input Panel */}
          <Card className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Clinical Notes</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleLoadSample}>
                  Load Sample
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Textarea
                value={inputNotes}
                onChange={(e) => setInputNotes(e.target.value)}
                placeholder="Paste or load clinical notes for validation..."
                className="flex-1 min-h-[300px] resize-none text-sm"
              />
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
    </div>
  );
};

export default BillingValidator;
