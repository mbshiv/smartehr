import rawProfilesContent from "./PatientProfiles.txt?raw";

export interface PatientProfile {
  patientId: string;
  name: string;
  dob: string;
  gender: string;
  insurance: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
}

export function parsePatientProfiles(): PatientProfile[] {
  const profiles: PatientProfile[] = [];
  const sections = rawProfilesContent.split(/----------------------------------------/);

  for (const section of sections) {
    const lines = section.trim().split("\n").filter((line) => line.trim());
    if (lines.length < 2) continue;

    const profile: Partial<PatientProfile> = {};

    for (const line of lines) {
      const [key, ...valueParts] = line.split(":");
      const value = valueParts.join(":").trim();

      if (line.match(/^Patient \d+/)) {
        // Extract patient number from "Patient 001" format
        const match = line.match(/Patient (\d+)/);
        if (match) {
          profile.patientId = `PATIENT_${match[1].padStart(3, "0")}`;
        }
      } else if (key.trim().toLowerCase() === "name") {
        profile.name = value;
      } else if (key.trim().toLowerCase() === "dob") {
        profile.dob = value;
      } else if (key.trim().toLowerCase() === "gender") {
        profile.gender = value;
      } else if (key.trim().toLowerCase() === "insurance") {
        profile.insurance = value;
      } else if (key.trim().toLowerCase() === "allergies") {
        profile.allergies = value === "None" ? [] : value.split(",").map((a) => a.trim());
      } else if (key.trim().toLowerCase() === "conditions") {
        profile.conditions = value === "None" ? [] : value.split(",").map((c) => c.trim());
      } else if (key.trim().toLowerCase() === "medications") {
        profile.medications = value === "None" ? [] : value.split(",").map((m) => m.trim());
      }
    }

    if (profile.patientId && profile.name) {
      profiles.push(profile as PatientProfile);
    }
  }

  return profiles;
}

export function getPatientProfile(patientId: string): PatientProfile | null {
  const profiles = parsePatientProfiles();
  return profiles.find((p) => p.patientId === patientId) || null;
}

export function getDefaultPatientProfile(): PatientProfile {
  return {
    patientId: "P12345",
    name: "John Doe",
    dob: "1985-04-12",
    gender: "Male",
    insurance: "BlueCross PPO",
    allergies: ["Penicillin"],
    conditions: ["Type 2 Diabetes", "Hypertension"],
    medications: ["Metformin 500mg", "Lisinopril 10mg"],
  };
}
