import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { StructuredSOAPNote } from "./SOAPOutput";

interface SOAPDisplayReadOnlyProps {
  note: StructuredSOAPNote;
  noteTag?: string | null;
  onLoadNote?: () => void;
}

const SOAPDisplayReadOnly = ({ note, noteTag, onLoadNote }: SOAPDisplayReadOnlyProps) => {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            Clinical Notes
            {noteTag && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({noteTag})
              </span>
            )}
          </CardTitle>
          {onLoadNote && (
            <Button variant="ghost" size="sm" onClick={onLoadNote}>
              <FileText className="w-4 h-4 mr-1" />
              Load Clinical Note
            </Button>
          )}
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

        {/* Diagnoses */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Diagnoses
          </h4>
          <div className="flex flex-wrap gap-2">
            {note.diagnoses.map((diagnosis, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {diagnosis.name} ({diagnosis.code})
              </Badge>
            ))}
          </div>
        </div>

        {/* Suggested Orders */}
        {note.suggestedOrders.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Suggested Orders
            </h4>
            <ul className="list-disc list-inside text-sm text-foreground space-y-1">
              {note.suggestedOrders.map((order, index) => (
                <li key={index}>{order}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SOAPDisplayReadOnly;

// Helper function to parse structured note string back into StructuredSOAPNote
export function parseStructuredNoteString(noteString: string): StructuredSOAPNote | null {
  try {
    // Try to extract each section from the structured note string
    const chiefComplaintMatch = noteString.match(/Chief Complaint:\s*(.+?)(?=\n\n|\nHistory)/is);
    const hpiMatch = noteString.match(/History of Present Illness:\s*(.+?)(?=\n\n|\nAssessment)/is);
    const assessmentMatch = noteString.match(/Assessment:\s*(.+?)(?=\n\n|\nPlan)/is);
    const planMatch = noteString.match(/Plan:\s*(.+?)(?=\n\n|\nSuggested)/is);
    const ordersMatch = noteString.match(/Suggested Orders:\s*(.+?)(?=\n\n|\nPatient Portal)/is);
    const summaryMatch = noteString.match(/Patient Portal Summary:\s*(.+?)(?=\n━|$)/is);

    if (!chiefComplaintMatch) return null;

    const chiefComplaint = chiefComplaintMatch[1].trim();
    const hpiNarrative = hpiMatch ? hpiMatch[1].trim() : "Not documented";
    const assessment = assessmentMatch ? assessmentMatch[1].trim() : "Not documented";
    const plan = planMatch ? planMatch[1].trim() : "Not documented";
    const patientPortalSummary = summaryMatch ? summaryMatch[1].trim() : "";

    // Parse diagnoses from assessment
    const diagnoses: { name: string; code: string }[] = [];
    const diagnosisLines = assessment.split('\n');
    diagnosisLines.forEach(line => {
      const match = line.match(/\d+\.\s*(.+?)\s*\(([A-Z]\d+\.?\d*)\)/);
      if (match) {
        diagnoses.push({ name: match[1].trim(), code: match[2] });
      }
    });

    // Parse suggested orders
    const suggestedOrders: string[] = [];
    if (ordersMatch) {
      const orderLines = ordersMatch[1].split('\n');
      orderLines.forEach(line => {
        const order = line.replace(/^[•\-]\s*/, '').trim();
        if (order) suggestedOrders.push(order);
      });
    }

    return {
      chiefComplaint,
      hpiNarrative,
      assessment,
      plan,
      diagnoses,
      suggestedOrders,
      patientPortalSummary,
    };
  } catch {
    return null;
  }
}
