import { User, Calendar, Shield, AlertTriangle, Heart } from "lucide-react";
import { syntheticPatient } from "@/data/syntheticData";
import { Badge } from "@/components/ui/badge";

const PatientSidebar = () => {
  const patient = syntheticPatient;

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <aside className="w-80 bg-card border-l border-border h-full overflow-y-auto">
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
              <span className="font-mono text-foreground">{patient.patient_id}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-20">DOB</span>
              <span className="text-foreground">
                {new Date(patient.dob).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground w-20">PCP</span>
              <span className="text-foreground">{patient.pcp}</span>
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

        {/* Last Visit */}
        <section>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Last Visit
          </h3>
          <p className="text-sm text-foreground">
            {new Date(patient.lastVisit).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </section>

        {/* Allergies */}
        <section>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
            Allergies
          </h3>
          <div className="flex flex-wrap gap-2">
            {patient.allergies.map((allergy) => (
              <Badge
                key={allergy}
                variant="outline"
                className="bg-destructive/10 text-destructive border-destructive/30"
              >
                {allergy}
              </Badge>
            ))}
          </div>
        </section>

        {/* Active Conditions */}
        <section>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Heart className="w-3.5 h-3.5" />
            Active Conditions
          </h3>
          <div className="space-y-2">
            {patient.conditions.map((condition) => (
              <div
                key={condition}
                className="bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground"
              >
                {condition}
              </div>
            ))}
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
    </aside>
  );
};

export default PatientSidebar;
