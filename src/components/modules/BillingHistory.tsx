import { useState } from "react";
import { ArrowLeft, DollarSign, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBillingValidations, BillingValidation } from "@/hooks/useBillingValidations";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BillingHistoryProps {
  onBack: () => void;
}

const BillingHistory = ({ onBack }: BillingHistoryProps) => {
  const { validations, loading, deleteValidation } = useBillingValidations();
  const [selectedValidation, setSelectedValidation] = useState<BillingValidation | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Auto-select topmost validation when data loads
  if (!loading && validations.length > 0 && !selectedValidation && !hasAutoSelected) {
    setSelectedValidation(validations[0]);
    setHasAutoSelected(true);
  }

  const handleDelete = async (validationId: string) => {
    setIsDeleting(validationId);
    const { error } = await deleteValidation(validationId);
    if (error) {
      toast.error("Failed to delete validation");
    } else {
      toast.success("Validation deleted");
      if (selectedValidation?.id === validationId) {
        setSelectedValidation(null);
      }
    }
    setIsDeleting(null);
  };

  const getRiskLevel = (score: number): "low" | "medium" | "high" => {
    if (score <= 30) return "low";
    if (score <= 60) return "medium";
    return "high";
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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Billing History</h2>
            <p className="text-sm text-muted-foreground">
              {validations.length} saved validation{validations.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-hidden">
        {validations.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No saved validations yet</p>
              <p className="text-sm mt-1">Validate and save claims to see them here</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Validations List */}
            <div className="space-y-3 overflow-y-auto">
              {validations.map((validation) => {
                const riskLevel = getRiskLevel(validation.denial_risk_score);
                return (
                  <Card
                    key={validation.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      selectedValidation?.id === validation.id ? "border-primary ring-1 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedValidation(validation)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground">
                              Patient: {validation.patient_id}
                            </p>
                            <Badge className={cn("text-xs", getRiskColor(riskLevel))}>
                              {validation.denial_risk_score}% Risk
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(validation.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {validation.icd10_codes.slice(0, 2).map((code: any) => (
                              <Badge key={code.code} variant="outline" className="text-xs font-mono">
                                {code.code}
                              </Badge>
                            ))}
                            {validation.icd10_codes.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{validation.icd10_codes.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isDeleting === validation.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Validation</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this billing validation. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(validation.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Selected Validation Detail */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Validation Detail</CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[calc(100vh-300px)]">
                {selectedValidation ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Clinical Notes
                      </p>
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <pre className="whitespace-pre-wrap text-sm">
                          {selectedValidation.clinical_notes}
                        </pre>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          ICD-10 Codes
                        </p>
                        <div className="space-y-1">
                          {selectedValidation.icd10_codes.map((code: any) => (
                            <div key={code.code} className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {code.code}
                              </Badge>
                              <span className="text-xs text-muted-foreground">({code.confidence}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          CPT Codes
                        </p>
                        <div className="space-y-1">
                          {selectedValidation.cpt_codes.map((code: any) => (
                            <div key={code.code} className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {code.code}
                              </Badge>
                              <span className="text-xs text-muted-foreground">({code.confidence}%)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {selectedValidation.missing_elements.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Missing Elements
                        </p>
                        <ul className="list-disc list-inside text-sm text-foreground">
                          {selectedValidation.missing_elements.map((el, i) => (
                            <li key={i}>{el}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedValidation.recommendations.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Recommendations
                        </p>
                        <ul className="space-y-1">
                          {selectedValidation.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">Select a validation to view details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingHistory;
