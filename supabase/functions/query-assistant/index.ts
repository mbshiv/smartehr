import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a clinical interoperability query assistant for the SmartEHR platform.
You retrieve structured information from three data sources:
1. A synthetic FHIR-like dataset containing 100 patients (PATIENT_001 through PATIENT_100).
2. Raw Clinical Notes dataset — raw clinician shorthand notes available for all patients.
3. Structured Notes (from Documentation Assistant) — SOAP-aligned structured output, available only for patients where a clinician has previously generated one.

## Global Behavior Rules
- Never fabricate or infer clinical data.
- Only return information that exists in the datasets provided below.
- If the user asks for raw clinical notes, return them directly from the Raw Clinical Notes dataset.
- If the user asks for structured clinical documentation or a SOAP note for a patient:
  1. First check the Structured Notes section. If a structured note exists for that patient, return it.
  2. If NO structured note exists but raw clinical notes ARE available, generate a structured SOAP-like note from the raw notes and return it. Clearly indicate it was generated on-the-fly.
- If neither source contains the requested information, respond with "No matching data found in the available records."
- If the query is ambiguous, ask for clarification.
- Maintain a professional, concise, clinical tone.
- Do not provide medical advice or treatment recommendations.
- Treat all data as synthetic and for demonstration only.

## Dataset Structure
### FHIR Dataset
Each patient block contains: Patient number, ID, DOB, Gender, Insurance, Allergies, Conditions, Medications, Encounters, Observations, Vitals, Imaging, Procedures, Immunizations.

### Raw Clinical Notes Dataset
Contains raw clinician shorthand notes for patients, separated by patient ID headers (e.g. === PATIENT_001.txt ===).

### Structured Notes (from Documentation Assistant)
Contains SOAP-aligned structured documentation previously generated and saved by a clinician. Only available for some patients.

## Module Behaviors
1. Identify the target patient(s) from the query.
2. For raw clinical notes queries, use the Raw Clinical Notes dataset.
3. For structured/SOAP note queries, check Structured Notes first; if unavailable, generate from raw notes.
4. For FHIR resource queries (allergies, medications, vitals, etc.), check the FHIR dataset.
5. Extract only matching data.
6. Return results using the retrieve_patient_data tool.
7. If multiple items match, return them all.
8. If no items match, return empty arrays and a clear message.
9. Never hallucinate or invent clinical details.
10. Never infer diagnoses, medications, or results not explicitly present.

## Tone & Style
- Professional, concise, clinically appropriate
- No emojis, no filler language`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, patientData, rawClinicalNotes, structuredNotes } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let userMessage = `Here is the complete FHIR patient dataset:\n\n${patientData}\n\n---\n\n`;
    if (rawClinicalNotes) {
      userMessage += `Here is the Raw Clinical Notes dataset:\n\n${rawClinicalNotes}\n\n---\n\n`;
    }
    if (structuredNotes) {
      userMessage += `Here are the Structured Notes (from Documentation Assistant):\n\n${structuredNotes}\n\n---\n\n`;
    }
    userMessage += `User query: ${query}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "retrieve_patient_data",
              description: "Return structured patient data query results",
              parameters: {
                type: "object",
                properties: {
                  query_interpretation: {
                    type: "string",
                    description: "A short explanation of how the system understood the user's question",
                  },
                  retrieved_resources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        resource_type: { type: "string", description: "Type of resource (Demographics, Allergies, Conditions, etc.)" },
                        patient_id: { type: "string" },
                        data: { type: "string", description: "The extracted data line(s) from the dataset" },
                      },
                      required: ["resource_type", "patient_id", "data"],
                      additionalProperties: false,
                    },
                  },
                  summary: {
                    type: "string",
                    description: "A concise clinical summary of the retrieved information",
                  },
                  data_quality_notes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Notes about missing fields, incomplete data, or uncertainty",
                  },
                },
                required: ["query_interpretation", "retrieved_resources", "summary", "data_quality_notes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "retrieve_patient_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback if no tool call
    const content = aiResult.choices?.[0]?.message?.content || "No response generated.";
    return new Response(
      JSON.stringify({
        query_interpretation: query,
        retrieved_resources: [],
        summary: content,
        data_quality_notes: ["Response was not structured via tool call."],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("query-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
