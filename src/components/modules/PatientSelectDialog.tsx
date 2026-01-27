import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User } from "lucide-react";
import { parseRawClinicalNotes, PatientNote } from "@/data/rawClinicalNotesParser";

interface PatientSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (patientId: string, notes: string) => void;
}

const PatientSelectDialog = ({
  open,
  onOpenChange,
  onSelect,
}: PatientSelectDialogProps) => {
  const [search, setSearch] = useState("");
  const patients = useMemo(() => parseRawClinicalNotes(), []);

  const filteredPatients = useMemo(() => {
    if (!search.trim()) return patients;
    const query = search.toLowerCase();
    return patients.filter(
      (p) =>
        p.patientId.toLowerCase().includes(query) ||
        p.notes.toLowerCase().includes(query)
    );
  }, [patients, search]);

  const handleSelect = (patient: PatientNote) => {
    onSelect(patient.patientId, patient.notes);
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Select Patient Notes</DialogTitle>
          <DialogDescription>
            Choose a patient to load their raw clinical notes
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient ID or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[300px] border rounded-lg">
          <div className="p-2 space-y-1">
            {filteredPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No patients found
              </p>
            ) : (
              filteredPatients.map((patient) => (
                <Button
                  key={patient.patientId}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3 px-3"
                  onClick={() => handleSelect(patient)}
                >
                  <User className="w-4 h-4 mr-3 text-muted-foreground shrink-0" />
                  <div className="text-left overflow-hidden">
                    <p className="font-medium text-sm">{patient.patientId}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[350px]">
                      {patient.notes.split("\n")[0]}
                    </p>
                  </div>
                </Button>
              ))
            )}
          </div>
        </ScrollArea>

        <p className="text-xs text-muted-foreground text-center">
          {filteredPatients.length} of {patients.length} patients
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default PatientSelectDialog;
