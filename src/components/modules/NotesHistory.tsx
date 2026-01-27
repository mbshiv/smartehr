import { useState } from "react";
import { ArrowLeft, FileText, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClinicalNotes, ClinicalNote } from "@/hooks/useClinicalNotes";
import { format } from "date-fns";
import { toast } from "sonner";
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

interface NotesHistoryProps {
  onBack: () => void;
}

const NotesHistory = ({ onBack }: NotesHistoryProps) => {
  const { notes, loading, deleteNote } = useClinicalNotes();
  const [selectedNote, setSelectedNote] = useState<ClinicalNote | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (noteId: string) => {
    setIsDeleting(noteId);
    const { error } = await deleteNote(noteId);
    if (error) {
      toast.error("Failed to delete note");
    } else {
      toast.success("Note deleted");
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
      }
    }
    setIsDeleting(null);
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
            <h2 className="text-xl font-semibold text-foreground">Notes History</h2>
            <p className="text-sm text-muted-foreground">
              {notes.length} saved note{notes.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-hidden">
        {notes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No saved notes yet</p>
              <p className="text-sm mt-1">Generate and save notes to see them here</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* Notes List */}
            <div className="space-y-3 overflow-y-auto">
              {notes.map((note) => (
                <Card
                  key={note.id}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    selectedNote?.id === note.id ? "border-primary ring-1 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedNote(note)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          Patient: {note.patient_id}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {note.raw_notes.slice(0, 100)}...
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isDeleting === note.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Note</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this clinical note. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(note.id)}
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
              ))}
            </div>

            {/* Selected Note Detail */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Note Detail</CardTitle>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[calc(100vh-300px)]">
                {selectedNote ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Raw Notes
                      </p>
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <pre className="whitespace-pre-wrap text-sm font-mono">
                          {selectedNote.raw_notes}
                        </pre>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        Structured Note
                      </p>
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                          {selectedNote.structured_note}
                        </pre>
                      </div>
                    </div>
                    {selectedNote.reasoning && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          AI Reasoning
                        </p>
                        <div className="bg-accent/50 rounded-lg p-3">
                          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                            {selectedNote.reasoning}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">Select a note to view details</p>
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

export default NotesHistory;
