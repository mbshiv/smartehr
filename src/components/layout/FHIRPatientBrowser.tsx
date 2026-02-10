import { useState, useMemo } from "react";
import { Users, Search, ChevronRight, ChevronDown, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import fhirData from "@/data/FHIRPatientBundles.txt?raw";

interface ParsedPatient {
  id: string;
  raw: string;
  sections: Record<string, string>;
}

function parseAllPatients(): ParsedPatient[] {
  const blocks = fhirData.split(/(?=={10,})/);
  const patients: ParsedPatient[] = [];

  for (const block of blocks) {
    const idMatch = block.match(/PATIENT_(\d+)/);
    if (!idMatch) continue;
    const id = `PATIENT_${idMatch[1].padStart(3, "0")}`;

    // Parse sections
    const sections: Record<string, string> = {};
    const sectionRegex = /^([A-Z][A-Za-z /&]+):\s*$/gm;
    let match: RegExpExecArray | null;
    const sectionStarts: { name: string; index: number }[] = [];

    while ((match = sectionRegex.exec(block)) !== null) {
      sectionStarts.push({ name: match[1].trim(), index: match.index + match[0].length });
    }

    for (let i = 0; i < sectionStarts.length; i++) {
      const start = sectionStarts[i].index;
      const end = i + 1 < sectionStarts.length ? sectionStarts[i + 1].index - sectionStarts[i + 1].name.length - 2 : block.length;
      const content = block.slice(start, end).trim();
      if (content) sections[sectionStarts[i].name] = content;
    }

    // Fallback: if no sections parsed, grab lines after the header
    if (Object.keys(sections).length === 0) {
      const lines = block.split("\n").filter((l) => l.trim() && !l.startsWith("="));
      sections["Full Record"] = lines.join("\n");
    }

    patients.push({ id, raw: block.trim(), sections });
  }

  return patients.sort((a, b) => a.id.localeCompare(b.id));
}

const FHIRPatientBrowser = () => {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const allPatients = useMemo(() => parseAllPatients(), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return allPatients;
    const q = search.toLowerCase();
    return allPatients.filter(
      (p) => p.id.toLowerCase().includes(q) || p.raw.toLowerCase().includes(q)
    );
  }, [allPatients, search]);

  const togglePatient = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedSections(new Set());
    } else {
      setExpandedId(id);
      setExpandedSections(new Set());
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  return (
    <aside className="w-80 bg-card border-l border-border h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            FHIR Patient Records
          </h3>
          <Badge variant="secondary" className="text-xs ml-auto">
            {filtered.length}
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients..."
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* Patient List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No patients match your search.
            </p>
          ) : (
            filtered.map((patient) => {
              const isExpanded = expandedId === patient.id;
              return (
                <div key={patient.id}>
                  {/* Patient row */}
                  <button
                    onClick={() => togglePatient(patient.id)}
                    className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent/50 ${
                      isExpanded ? "bg-primary/5 text-primary font-medium" : "text-foreground"
                    }`}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <User className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-mono text-xs">{patient.id}</span>
                  </button>

                  {/* Expanded FHIR sections */}
                  {isExpanded && (
                    <div className="ml-5 pl-3 border-l-2 border-border space-y-0.5 py-1">
                      {Object.entries(patient.sections).map(([name, content]) => {
                        const isSectionOpen = expandedSections.has(name);
                        return (
                          <div key={name}>
                            <button
                              onClick={() => toggleSection(name)}
                              className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                            >
                              {isSectionOpen ? (
                                <ChevronDown className="w-3 h-3 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3 h-3 shrink-0" />
                              )}
                              <span className="font-medium">{name}</span>
                            </button>
                            {isSectionOpen && (
                              <div className="ml-5 px-2 py-1.5 bg-secondary/30 rounded text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
                                {content}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-accent/30">
        <p className="text-xs text-muted-foreground">
          ⚠️ Synthetic FHIR data only. No real PHI.
        </p>
      </div>
    </aside>
  );
};

export default FHIRPatientBrowser;
