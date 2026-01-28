import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCopy, Check, Save, Loader2 } from "lucide-react";

export interface StructuredSOAPNote {
  chiefComplaint: string;
  hpiNarrative: string;
  assessment: string;
  plan: string;
  diagnoses: { name: string; code: string }[];
  suggestedOrders: string[];
  patientPortalSummary: string;
}

interface SOAPOutputProps {
  note: StructuredSOAPNote;
  onCopy: () => void;
  onSave: () => void;
  copied: boolean;
  isSaving: boolean;
}

const SOAPOutput = ({ note, onCopy, onSave, copied, isSaving }: SOAPOutputProps) => {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Structured Output (SOAP)</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCopy}>
              {copied ? <Check className="w-4 h-4 mr-1" /> : <ClipboardCopy className="w-4 h-4 mr-1" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-4">
        {/* Chief Complaint */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Chief Complaint
          </h4>
          <p className="text-sm text-foreground">{note.chiefComplaint}</p>
        </div>

        {/* History of Present Illness */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            History of Present Illness (HPI)
          </h4>
          <p className="text-sm text-foreground leading-relaxed">{note.hpiNarrative}</p>
        </div>

        {/* Assessment & Plan Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-primary/10 rounded-lg p-4">
          <div>
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
              Assessment
            </h4>
            <p className="text-sm text-foreground whitespace-pre-line">{note.assessment}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">
              Plan
            </h4>
            <p className="text-sm text-foreground whitespace-pre-line">{note.plan}</p>
          </div>
        </div>

        {/* Suggested Orders & Diagnoses */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Suggested Orders & Diagnoses
          </h4>
          <div className="flex flex-wrap gap-2 mb-3">
            {note.diagnoses.map((diagnosis, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {diagnosis.name} ({diagnosis.code})
              </Badge>
            ))}
          </div>
          {note.suggestedOrders.length > 0 && (
            <ul className="list-disc list-inside text-sm text-foreground space-y-1">
              {note.suggestedOrders.map((order, index) => (
                <li key={index}>{order}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Patient Portal Summary */}
        <div className="bg-warning/15 border-l-4 border-warning rounded-r-lg p-4">
          <h4 className="text-xs font-semibold text-warning uppercase tracking-wide mb-2">
            Patient Portal Summary
          </h4>
          <p className="text-sm text-foreground leading-relaxed">{note.patientPortalSummary}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SOAPOutput;
