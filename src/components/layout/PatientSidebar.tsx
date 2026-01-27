import { User, Calendar, Shield, AlertTriangle, Heart, Pill } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPatientProfile, getDefaultPatientProfile, PatientProfile } from "@/data/patientProfilesParser";
import { useMemo } from "react";
interface PatientSidebarProps {
  selectedPatientId: string | null;
}
const PatientSidebar = ({
  selectedPatientId
}: PatientSidebarProps) => {
  const patient = useMemo<PatientProfile | null>(() => {
    if (selectedPatientId) {
      return getPatientProfile(selectedPatientId);
    }
    return null;
  }, [selectedPatientId]);
  if (!patient) {
    return <aside className="w-80 bg-card border-l border-border h-full overflow-y-auto flex flex-col items-center justify-center">
        <div className="text-center p-6">
          <User className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-semibold text-lg text-muted-foreground">No Patient Selected</h2>
          <p className="text-sm text-muted-foreground/70 mt-2">
            Select a patient from the module to view their details.
          </p>
        </div>
        {/* Synthetic Data Notice */}
        <div className="p-4 m-4 bg-accent rounded-lg absolute bottom-4 left-130 right-4">
          <p className="text-xs text-accent-foreground font-medium text-center">
            ⚠️ Synthetic Data Only
          </p>
          <p className="text-xs text-accent-foreground/70 mt-1 text-center">
            No real PHI is used in this demo.
          </p>
        </div>
      </aside>;
  }
  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || monthDiff === 0 && today.getDate() < birthDate.getDate()) {
      age--;
    }
    return age;
  };
  return <aside className="w-80 bg-card border-l border-border h-full overflow-y-auto">
      {/* Patient Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-lg text-foreground">{patient.name}</h2>
            <p className="text-sm text-muted-foreground">
              {patient.gender} • {calculateAge(patient.dob)} years old
            </p>
          </div>
        </div>
      </div>

      {/* Patient Details */}
      <div className="p-6 space-y-6">
        {/* Demographics */}
        <section>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Demographics
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-20">Patient ID</span>
              <span className="font-mono text-foreground">{patient.patientId}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-20">DOB</span>
              <span className="text-foreground">
                {new Date(patient.dob).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              })}
              </span>
            </div>
          </div>
        </section>

        {/* Insurance */}
        <section>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            Insurance
          </h3>
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="font-medium text-sm text-foreground">{patient.insurance}</p>
            <p className="text-xs text-muted-foreground mt-1">Active Coverage</p>
          </div>
        </section>

        {/* Allergies */}
        <section>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            Allergies
          </h3>
          <div className="flex flex-wrap gap-2">
            {patient.allergies.length > 0 ? patient.allergies.map(allergy => <Badge key={allergy} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  {allergy}
                </Badge>) : <span className="text-sm text-muted-foreground">No known allergies</span>}
          </div>
        </section>

        {/* Active Conditions */}
        <section>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Heart className="w-3.5 h-3.5" />
            Active Conditions
          </h3>
          <div className="space-y-2">
            {patient.conditions.length > 0 ? patient.conditions.map(condition => <div key={condition} className="bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground">
                  {condition}
                </div>) : <span className="text-sm text-muted-foreground">No active conditions</span>}
          </div>
        </section>

        {/* Medications */}
        <section>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Pill className="w-3.5 h-3.5" />
            Current Medications
          </h3>
          <div className="space-y-2">
            {patient.medications.length > 0 ? patient.medications.map(medication => <div key={medication} className="bg-accent/50 rounded-lg px-3 py-2 text-sm text-foreground">
                  {medication}
                </div>) : <span className="text-sm text-muted-foreground">No current medications</span>}
          </div>
        </section>
      </div>

      {/* Synthetic Data Notice */}
      <div className="p-4 m-4 mt-0 bg-accent rounded-lg">
        <p className="text-xs text-accent-foreground font-medium">
          ⚠️ Synthetic Data Only
        </p>
        <p className="text-xs text-accent-foreground/70 mt-1">
          No real PHI is used in this demo.
        </p>
      </div>
    </aside>;
};
export default PatientSidebar;