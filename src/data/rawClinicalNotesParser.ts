import rawNotesContent from "./RawClinicalNotes.txt?raw";

export interface PatientNote {
  patientId: string;
  notes: string;
}

export function parseRawClinicalNotes(): PatientNote[] {
  const patients: PatientNote[] = [];
  const sections = rawNotesContent.split(/===\s*(PATIENT_\d+)\.txt\s*===/);
  
  // sections[0] is empty or whitespace before first patient
  // sections[1] is "PATIENT_001", sections[2] is the content, etc.
  for (let i = 1; i < sections.length; i += 2) {
    const patientId = sections[i];
    const notes = sections[i + 1]?.trim() || "";
    if (patientId && notes) {
      patients.push({ patientId, notes });
    }
  }
  
  return patients;
}

export function getPatientNotes(patientId: string): string | null {
  const patients = parseRawClinicalNotes();
  const patient = patients.find((p) => p.patientId === patientId);
  return patient?.notes || null;
}

export function getAllPatientIds(): string[] {
  return parseRawClinicalNotes().map((p) => p.patientId);
}
