// Synthetic Patient Data for NextGenEHR Demo
// NO REAL PHI - All data is fictional

export const syntheticPatient = {
  patient_id: "P12345",
  name: "John Doe",
  dob: "1985-04-12",
  gender: "Male",
  insurance: "BlueCross BlueShield",
  pcp: "Dr. Sarah Chen",
  lastVisit: "2026-01-15",
  allergies: ["Penicillin"],
  conditions: ["Type 2 Diabetes", "Essential Hypertension"],
};

export const syntheticEncounterNote = `Chief Complaint
Patient presents with increased thirst, frequent urination, and fatigue.

History of Present Illness
Reports poor adherence to diabetes medication over the last month. Blood pressure elevated at 148/92. A1C from last visit was 8.9%. No signs of acute distress.

Assessment
- Type 2 Diabetes with poor control
- Essential Hypertension

Plan
Reinforce medication adherence, adjust Metformin dosage, order repeat A1C, schedule follow-up in 3 months.`;

export const suggestedICD10Codes = [
  { code: "E11.65", description: "Type 2 Diabetes with poor control" },
  { code: "I10", description: "Essential Hypertension" },
];

export const suggestedCPTCodes = [
  { code: "99214", description: "Established patient office visit, moderate complexity" },
];

export const denialRules = [
  {
    id: "DR001",
    rule: "Missing or incomplete plan documentation",
    riskIncrease: 25,
    applies: false,
  },
  {
    id: "DR002",
    rule: "ICD-10 code specificity insufficient",
    riskIncrease: 15,
    applies: false,
  },
  {
    id: "DR003",
    rule: "Medical necessity not established",
    riskIncrease: 30,
    applies: false,
  },
  {
    id: "DR004",
    rule: "CPT/ICD-10 code mismatch",
    riskIncrease: 20,
    applies: false,
  },
];

export const sampleRawClinicianNotes = `pt came in c/o increased thirst and urination x 3 weeks
not taking metformin regularly - missed several doses
BP 148/92, slightly elevated
last a1c was 8.9 - needs better control
dx: t2dm uncontrolled, htn
plan: increase metformin, recheck a1c, f/u 3mo`;
