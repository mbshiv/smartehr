
# Structured SOAP Output Redesign

## Overview
Transform the plain-text structured output into a rich, visually formatted SOAP (Subjective, Objective, Assessment, Plan) display matching the reference design, without the status badge.

## Current State
- The structured output is rendered as plain text with markdown-style formatting
- Output is displayed in a `<pre>` tag with basic styling
- No visual hierarchy or colored sections

## Target Design
The new design includes:
1. **Header** with "Structured Output (SOAP)" title (no badge)
2. **Chief Complaint** section with uppercase label and content
3. **History of Present Illness (HPI)** section with descriptive narrative
4. **Assessment & Plan** side-by-side in a blue/primary colored card
5. **Suggested Orders & Diagnoses** section with diagnosis badges and bullet-pointed orders
6. **Patient Portal Summary** in a yellow/warning colored panel at the bottom

## Implementation Plan

### Step 1: Create New Data Structure
Return a structured object from `generateStructuredNote()`:

```text
StructuredSOAPNote {
  chiefComplaint: string
  hpiNarrative: string
  assessment: string
  plan: string
  diagnoses: { name: string; code: string }[]
  suggestedOrders: string[]
  patientPortalSummary: string
}
```

### Step 2: Create SOAPOutput Component
Create `src/components/modules/SOAPOutput.tsx` with:
- Card header showing "Structured Output (SOAP)"
- Labeled sections with uppercase headings (Chief Complaint, HPI)
- Blue/primary background card with two columns for Assessment and Plan
- Diagnosis badges in outline style
- Bulleted list for suggested orders
- Yellow/warning panel for patient portal summary

### Step 3: Update DocumentationAssistant
- Modify state to store the structured object
- Replace the plain `<pre>` output with the new `SOAPOutput` component
- Keep copy functionality by serializing the structured note to text
- Adjust save logic to store formatted output for Billing Validator integration

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/modules/SOAPOutput.tsx` | Create - New component for rendering structured SOAP note |
| `src/components/modules/DocumentationAssistant.tsx` | Modify - Update state, parsing logic, and render the new component |

## Component Structure

```text
Card
  CardHeader: "Structured Output (SOAP)" + Copy/Save buttons
  CardContent:
    Section: CHIEF COMPLAINT
    Section: HISTORY OF PRESENT ILLNESS (HPI)
    
    Grid (2 columns, primary/10 background):
      Column 1: ASSESSMENT content
      Column 2: PLAN content
    
    Section: SUGGESTED ORDERS & DIAGNOSES
      Flex container with Badge components for each diagnosis
      Unordered list of suggested orders
    
    Warning panel (amber/yellow):
      PATIENT PORTAL SUMMARY heading
      Summary text
```

## Data Flow
1. User enters raw notes
2. `generateStructuredNote()` parses and returns `StructuredSOAPNote` object
3. `SOAPOutput` component receives the object and renders the visual layout
4. Copy button serializes the structured note to plain text for clipboard
5. Save button stores both raw and structured data to the database

## Compatibility
- The saved `structured_note` field will store a string representation for the Billing Validator
- No database schema changes required
