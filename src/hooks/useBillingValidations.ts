import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export interface BillingValidation {
  id: string;
  user_id: string;
  patient_id: string;
  clinical_notes: string;
  icd10_codes: { code: string; description: string; confidence: number }[];
  cpt_codes: { code: string; description: string; confidence: number }[];
  denial_risk_score: number;
  missing_elements: string[];
  recommendations: string[];
  created_at: string;
}

export function useBillingValidations() {
  const { user } = useAuthContext();
  const [validations, setValidations] = useState<BillingValidation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchValidations();
    } else {
      setValidations([]);
      setLoading(false);
    }
  }, [user]);

  const fetchValidations = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("billing_validations")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setValidations(data as BillingValidation[]);
    }
    setLoading(false);
  };

  const saveValidation = async (
    patientId: string,
    clinicalNotes: string,
    icd10Codes: { code: string; description: string; confidence: number }[],
    cptCodes: { code: string; description: string; confidence: number }[],
    denialRiskScore: number,
    missingElements: string[],
    recommendations: string[]
  ) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("billing_validations")
      .insert({
        user_id: user.id,
        patient_id: patientId,
        clinical_notes: clinicalNotes,
        icd10_codes: icd10Codes,
        cpt_codes: cptCodes,
        denial_risk_score: denialRiskScore,
        missing_elements: missingElements,
        recommendations: recommendations,
      })
      .select()
      .single();

    if (!error && data) {
      setValidations((prev) => [data as BillingValidation, ...prev]);
    }

    return { data, error };
  };

  const deleteValidation = async (validationId: string) => {
    const { error } = await supabase
      .from("billing_validations")
      .delete()
      .eq("id", validationId);

    if (!error) {
      setValidations((prev) => prev.filter((v) => v.id !== validationId));
    }

    return { error };
  };

  return {
    validations,
    loading,
    saveValidation,
    deleteValidation,
    refetch: fetchValidations,
  };
}
