import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, FileText, Loader2 } from "lucide-react";
import { useClinicalNotes, ClinicalNote } from "@/hooks/useClinicalNotes";
import { format } from "date-fns";

interface ClinicalNoteSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (note: ClinicalNote, noteTag: string) => void;
}

const ClinicalNoteSelectDialog = ({
  open,
  onOpenChange,
  onSelect,
}: ClinicalNoteSelectDialogProps) => {
  const [search, setSearch] = useState("");
  const { notes, loading } = useClinicalNotes();

  // Generate note tag from patient_id
  const getNoteTag = (patientId: string) => {
    // Extract numeric part if it's like "PATIENT_001"
    const match = patientId.match(/(\d+)/);
    const id = match ? match[1] : patientId;
    return `Patient_${id}_ClinicalNote`;
  };

  const filteredNotes = notes.filter((note) => {
    const noteTag = getNoteTag(note.patient_id);
    const searchLower = search.toLowerCase();
    return (
      note.patient_id.toLowerCase().includes(searchLower) ||
      noteTag.toLowerCase().includes(searchLower) ||
      note.raw_notes.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (note: ClinicalNote) => {
    const noteTag = getNoteTag(note.patient_id);
    onSelect(note, noteTag);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Load Clinical Note
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by patient ID or note tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <FileText className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">
                {notes.length === 0
                  ? "No saved clinical notes found. Generate and save notes from the Documentation Assistant first."
                  : "No matching notes found"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotes.map((note) => {
                const noteTag = getNoteTag(note.patient_id);
                return (
                  <Button
                    key={note.id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-4 hover:bg-accent"
                    onClick={() => handleSelect(note)}
                  >
                    <div className="flex flex-col items-start gap-1 w-full">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm">{noteTag}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(note.created_at), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Patient: {note.patient_id}
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-2 text-left">
                        {note.raw_notes.substring(0, 150)}...
                      </span>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ClinicalNoteSelectDialog;
