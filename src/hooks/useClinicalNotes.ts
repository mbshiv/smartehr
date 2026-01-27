import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface ClinicalNote {
  id: string;
  user_id: string;
  patient_id: string;
  raw_notes: string;
  structured_note: string;
  reasoning: string | null;
  created_at: string;
}

export function useClinicalNotes() {
  const { user } = useAuthContext();
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotes();
    } else {
      setNotes([]);
      setLoading(false);
    }
  }, [user]);

  const fetchNotes = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("clinical_notes")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setNotes(data);
    }
    setLoading(false);
  };

  const saveNote = async (
    patientId: string,
    rawNotes: string,
    structuredNote: string,
    reasoning?: string
  ) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("clinical_notes")
      .insert({
        user_id: user.id,
        patient_id: patientId,
        raw_notes: rawNotes,
        structured_note: structuredNote,
        reasoning: reasoning || null,
      })
      .select()
      .single();

    if (!error && data) {
      setNotes((prev) => [data, ...prev]);
    }

    return { data, error };
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from("clinical_notes")
      .delete()
      .eq("id", noteId);

    if (!error) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }

    return { error };
  };

  return {
    notes,
    loading,
    saveNote,
    deleteNote,
    refetch: fetchNotes,
  };
}
