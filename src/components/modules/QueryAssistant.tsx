import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Send, Loader2, Database, AlertCircle, ChevronDown, ChevronUp, Copy, Download, Check, Plus, History, Clock, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import fhirData from "@/data/FHIRPatientBundles.txt?raw";

export interface QueryResult {
  query_interpretation: string;
  retrieved_resources: Array<{
    resource_type: string;
    patient_id: string;
    data: string;
  }>;
  summary: string;
  data_quality_notes: string[];
}

export interface QueryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: QueryResult;
  error?: string;
  timestamp: number;
}

export interface QueryAssistantState {
  messages: QueryMessage[];
  currentSessionId: string | null;
}

interface ChatSession {
  session_id: string;
  firstQuery: string;
  queryCount: number;
  created_at: string;
}

interface QueryAssistantProps {
  state: QueryAssistantState;
  onStateChange: (state: QueryAssistantState) => void;
}

const EXAMPLE_QUERIES = [
  "List allergies for PATIENT_023",
  "Show me the last A1C for PATIENT_005",
  "What medications is PATIENT_042 taking?",
  "Summarize encounters for PATIENT_014",
  "What imaging has PATIENT_003 had?",
  "Give me all vitals for PATIENT_050",
];

const QueryAssistant = ({ state, onStateChange }: QueryAssistantProps) => {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthContext();

  const { messages, currentSessionId } = state;

  const updateState = (updates: Partial<QueryAssistantState>) => {
    onStateChange({ ...state, ...updates });
  };

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) {
        setTimeout(() => {
          viewport.scrollTop = viewport.scrollHeight;
        }, 50);
      }
    }
  }, [messages, isLoading]);

  // Load current session from DB on mount
  useEffect(() => {
    if (!user?.id || !currentSessionId || messages.length > 0) return;
    loadSession(currentSessionId);
  }, [user?.id, currentSessionId]);

  const loadSessions = useCallback(async () => {
    if (!user?.id) return;
    setSessionsLoading(true);
    try {
      const { data, error } = await supabase
        .from("query_history")
        .select("session_id, query, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;

      // Group by session_id
      const sessionMap = new Map<string, { firstQuery: string; queryCount: number; created_at: string }>();
      for (const row of data || []) {
        const sid = row.session_id as string;
        if (!sessionMap.has(sid)) {
          sessionMap.set(sid, { firstQuery: row.query, queryCount: 1, created_at: row.created_at });
        } else {
          const s = sessionMap.get(sid)!;
          s.queryCount++;
          if (row.created_at < s.created_at) {
            s.created_at = row.created_at;
            s.firstQuery = row.query;
          }
        }
      }

      const list: ChatSession[] = Array.from(sessionMap.entries())
        .map(([session_id, v]) => ({ session_id, ...v }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setSessions(list);
    } catch (e) {
      console.error("Failed to load sessions:", e);
    } finally {
      setSessionsLoading(false);
    }
  }, [user?.id]);

  const loadSession = async (sessionId: string) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("query_history")
      .select("*")
      .eq("user_id", user.id)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to load session:", error);
      return;
    }

    if (data && data.length > 0) {
      const restoredMessages: QueryMessage[] = [];
      for (const row of data) {
        restoredMessages.push({
          id: `${row.id}-q`,
          role: "user",
          content: row.query,
          timestamp: new Date(row.created_at).getTime(),
        });
        const result = row.result as unknown as QueryResult;
        restoredMessages.push({
          id: row.id,
          role: "assistant",
          content: result?.summary || "",
          result,
          timestamp: new Date(row.created_at).getTime() + 1,
        });
      }
      updateState({ messages: restoredMessages, currentSessionId: sessionId });
    }
    setShowHistory(false);
  };

  const deleteSession = async (sessionId: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("query_history")
      .delete()
      .eq("user_id", user.id)
      .eq("session_id", sessionId);

    if (error) {
      toast.error("Failed to delete session");
      return;
    }

    toast.success("Session deleted");
    setSessions((prev) => prev.filter((s) => s.session_id !== sessionId));

    if (currentSessionId === sessionId) {
      updateState({ messages: [], currentSessionId: null });
    }
  };

  const handleNewChat = () => {
    updateState({ messages: [], currentSessionId: null });
  };

  const handleOpenHistory = () => {
    setShowHistory(true);
    loadSessions();
  };

  const saveToDb = async (query: string, result: QueryResult, sessionId: string) => {
    if (!user?.id) return;
    const { error } = await supabase.from("query_history").insert({
      user_id: user.id,
      query,
      result: result as any,
      session_id: sessionId,
    });
    if (error) console.error("Failed to save query history:", error);
  };

  const handleSubmit = async (query?: string) => {
    const q = query || input.trim();
    if (!q || isLoading) return;

    // Create session if needed
    const sessionId = currentSessionId || crypto.randomUUID();
    if (!currentSessionId) {
      updateState({ ...state, currentSessionId: sessionId });
    }

    const userMsg: QueryMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: q,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    onStateChange({ messages: newMessages, currentSessionId: sessionId });
    setInput("");
    setIsLoading(true);

    try {
      // Fetch saved clinical notes from the Documentation Assistant module
      let clinicalNotesContext = "";
      if (user?.id) {
        const { data: savedNotes } = await supabase
          .from("clinical_notes")
          .select("patient_id, raw_notes, structured_note, reasoning")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (savedNotes && savedNotes.length > 0) {
          clinicalNotesContext = savedNotes.map((n) => {
            let entry = `=== Clinical Note for ${n.patient_id} ===\n`;
            if (n.structured_note) {
              entry += `STRUCTURED OUTPUT:\n${n.structured_note}\n`;
            }
            entry += `RAW NOTES:\n${n.raw_notes}\n`;
            return entry;
          }).join("\n");
        }
      }

      const { data, error } = await supabase.functions.invoke("query-assistant", {
        body: { query: q, patientData: fhirData, clinicalNotes: clinicalNotesContext },
      });

      if (error) throw error;

      if (data?.error) {
        const errMsg: QueryMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "",
          error: data.error,
          timestamp: Date.now(),
        };
        onStateChange({ messages: [...newMessages, errMsg], currentSessionId: sessionId });
      } else {
        const assistantMsg: QueryMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.summary || "",
          result: data as QueryResult,
          timestamp: Date.now(),
        };
        onStateChange({ messages: [...newMessages, assistantMsg], currentSessionId: sessionId });
        await saveToDb(q, data as QueryResult, sessionId);
      }
    } catch (e: any) {
      console.error("Query error:", e);
      const errMsg: QueryMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        error: e.message || "Failed to process query",
        timestamp: Date.now(),
      };
      onStateChange({ messages: [...newMessages, errMsg], currentSessionId: sessionId });
      toast.error("Query failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-foreground">
              Interoperability Query Assistant
            </h2>
            <p className="text-sm text-muted-foreground">
              Query synthetic FHIR patient records using natural language
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenHistory}>
            <History className="w-4 h-4 mr-1" />
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            disabled={isLoading || messages.length === 0}
          >
            <Plus className="w-4 h-4 mr-1" />
            New Chat
          </Button>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <HistoryPanel
          sessions={sessions}
          loading={sessionsLoading}
          currentSessionId={currentSessionId}
          onSelect={loadSession}
          onDelete={deleteSession}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Messages Area */}
      {!showHistory && (
        <div className="flex-1 overflow-hidden" ref={scrollRef}>
          <ScrollArea className="h-full">
            <div className="p-6 space-y-4">
              {messages.length === 0 ? (
                <EmptyState onExampleClick={(q) => handleSubmit(q)} />
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              )}
              {isLoading && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Querying patient records...</span>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Input */}
      {!showHistory && (
        <div className="p-4 border-t border-border bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="flex gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about patient records... e.g. 'List allergies for PATIENT_023'"
                className="pl-9"
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            100 synthetic patients available (PATIENT_001 – PATIENT_100). No real PHI.
          </p>
        </div>
      )}
    </div>
  );
};

/* ─── History Panel ─── */
function HistoryPanel({
  sessions,
  loading,
  currentSessionId,
  onSelect,
  onDelete,
  onClose,
}: {
  sessions: ChatSession[];
  loading: boolean;
  currentSessionId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = searchTerm.trim()
    ? sessions.filter((s) =>
        s.firstQuery.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : sessions;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Past Sessions
          </h3>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search past sessions..."
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading sessions...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchTerm ? "No sessions match your search." : "No past sessions found."}
            </p>
          ) : (
            filtered.map((s) => (
              <div
                key={s.session_id}
                className={`group flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors hover:bg-accent/50 ${
                  s.session_id === currentSessionId ? "border-primary bg-primary/5" : "border-border"
                }`}
                onClick={() => onSelect(s.session_id)}
              >
                <Database className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {s.firstQuery}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {s.queryCount} {s.queryCount === 1 ? "query" : "queries"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(s.session_id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ onExampleClick }: { onExampleClick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Database className="w-16 h-16 text-muted-foreground/30 mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Query Patient Records
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        Ask natural language questions about the synthetic 100-patient FHIR dataset.
        Results are returned in structured clinical format.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
        {EXAMPLE_QUERIES.map((q) => (
          <Button
            key={q}
            variant="outline"
            size="sm"
            className="text-xs justify-start h-auto py-2 px-3 text-left"
            onClick={() => onExampleClick(q)}
          >
            <Search className="w-3 h-3 mr-2 shrink-0" />
            <span className="truncate">{q}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

/* ─── Result Actions ─── */
function ResultActions({ result }: { result: QueryResult }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-result-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON file downloaded");
  };

  return (
    <div className="flex gap-1.5">
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleCopy}>
        {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
        {copied ? "Copied" : "Copy JSON"}
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleExport}>
        <Download className="w-3 h-3 mr-1" />
        Export JSON
      </Button>
    </div>
  );
}

/* ─── Message Bubble ─── */
function MessageBubble({ message }: { message: QueryMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2.5 max-w-[80%]">
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.error) {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4 text-destructive" />
        </div>
        <Card className="border-destructive/30 max-w-[85%]">
          <CardContent className="p-3">
            <p className="text-sm text-destructive">{message.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const result = message.result;

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Database className="w-4 h-4 text-primary" />
      </div>
      <div className="space-y-3 max-w-[85%] min-w-0">
        {result && (
          <>
            <ResultActions result={result} />
            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Query Interpretation
                </p>
                <p className="text-sm text-foreground">{result.query_interpretation}</p>
              </CardContent>
            </Card>
            {result.retrieved_resources.length > 0 && (
              <ResourceList resources={result.retrieved_resources} />
            )}
            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Summary
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{result.summary}</p>
              </CardContent>
            </Card>
            {result.data_quality_notes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.data_quality_notes.map((note, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">
                    {note}
                  </Badge>
                ))}
              </div>
            )}
          </>
        )}
        {!result && message.content && (
          <Card>
            <CardContent className="p-3">
              <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ─── Resource List ─── */
function ResourceList({ resources }: { resources: QueryResult["retrieved_resources"] }) {
  const [expanded, setExpanded] = useState(resources.length <= 5);
  const displayed = expanded ? resources : resources.slice(0, 5);

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <span>Retrieved Resources ({resources.length})</span>
          {resources.length > 5 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setExpanded(!expanded)}>
              {expanded ? <><ChevronUp className="w-3 h-3 mr-1" />Collapse</> : <><ChevronDown className="w-3 h-3 mr-1" />Show All</>}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {displayed.map((r, i) => (
          <div key={i} className="bg-secondary/50 rounded-md px-3 py-2 text-sm">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs">{r.resource_type}</Badge>
              <span className="text-xs font-mono text-muted-foreground">{r.patient_id}</span>
            </div>
            <p className="text-foreground whitespace-pre-wrap">{r.data}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default QueryAssistant;
