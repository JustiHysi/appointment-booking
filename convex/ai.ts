"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import OpenAI from "openai";

// GPT-4o via OpenRouter. Using OpenAI's full model (not mini) for clinical
// reasoning. OpenAI's native json_schema strict mode is the most reliable
// implementation of structured output across OpenRouter.
const MODEL = "openai/gpt-4o";

const analysisJsonSchema = {
  type: "object",
  properties: {
    suggestedSpecialty: {
      type: "string",
      enum: [
        "General Practice", "Cardiology", "Dermatology", "Neurology",
        "Orthopedics", "Pediatrics", "Psychiatry", "Ophthalmology", "ENT", "Other",
      ],
      description: "The specialty that best matches the patient's chief complaint. Avoid defaulting to 'General Practice' unless symptoms are truly non-specific.",
    },
    urgencyLevel: {
      type: "string",
      enum: ["routine", "urgent", "emergency"],
      description: "routine: can wait weeks. urgent: needs care within 24-48h. emergency: life-threatening, send to ER.",
    },
    summary: {
      type: "string",
      description: "Clinical one-liner a doctor can read in 5 seconds before walking into the room. Must reference specific symptoms/findings from the patient's data, not generic phrases.",
    },
    possibleConditions: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 5,
      description: "Differential diagnoses using proper medical names (e.g. 'Acute bronchitis', 'Gastroesophageal reflux disease'), ranked most-to-least likely. Never use vague terms like 'infection' or 'inflammation'.",
    },
    recommendedTests: {
      type: "array",
      items: { type: "string" },
      description: "Named diagnostic tests (e.g. 'Complete Blood Count (CBC)', 'Chest X-ray PA/Lateral', 'Urinalysis', 'Troponin I'). Do NOT list vague terms like 'blood test' or 'imaging'.",
    },
    flags: {
      type: "array",
      items: { type: "string" },
      description: "Specific warnings for the doctor: red-flag symptom combinations (e.g. 'Chest pain + dyspnea — rule out PE'), drug interaction risks referencing the actual medications listed, or known complications of the patient's chronic conditions. Empty array if genuinely nothing concerning.",
    },
  },
  required: [
    "suggestedSpecialty", "urgencyLevel", "summary",
    "possibleConditions", "recommendedTests", "flags",
  ],
  additionalProperties: false,
};

export const analyzeIntake = action({
  args: {
    chiefComplaint: v.string(),
    symptomDuration: v.string(),
    painLevel: v.number(),
    medications: v.string(),
    allergies: v.string(),
    conditions: v.array(v.string()),
    ocrText: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });

    const systemPrompt = `You are a board-certified attending physician with 20 years of triage experience at a busy urban hospital. Your job: write a clinical pre-read that the treating doctor can skim in 30 seconds and walk in prepared.

# CRITICAL QUALITY RULES

You will be evaluated on specificity. Violations of these rules make your output useless:

1. **REFERENCE THE PATIENT.** Every field must cite specifics from THIS intake — the exact complaint words, the exact pain level, the exact medications/conditions listed. Generic outputs will be rejected.
2. **NO FILLER.** Never write "Patient should be evaluated", "Further workup needed", "Consider..." — the doctor already knows they're evaluating them.
3. **ICD-LEVEL DIAGNOSES.** Forbidden terms in possibleConditions: "infection", "inflammation", "pain", "disorder", "issue", "problem". Use names like "Acute viral gastroenteritis", "Community-acquired pneumonia", "Mechanical low back pain".
4. **NAMED TESTS.** Forbidden in recommendedTests: "blood test", "scan", "imaging", "lab work". Use exact names: "CBC with differential", "BMP", "CT head without contrast", "Chest X-ray PA/Lateral", "Urinalysis with culture", "Troponin I", "D-dimer".
5. **REAL DRUG INTERACTIONS.** Flags must reference actual medications from the list. If patient takes warfarin + you'd recommend NSAIDs — flag that. Don't flag "review all medications".
6. **AVOID GENERAL PRACTICE.** Only use "General Practice" if symptoms are truly nonspecific (fatigue, malaise with no focal findings). Otherwise route to the correct specialty.

# REASONING FRAMEWORK (do this internally, don't output it)

Step 1: What system is involved? (cardiac, GI, neuro, etc.) → narrows specialty
Step 2: What's the time course? Acute (hours-days), subacute (weeks), chronic (months+)?
Step 3: What does pain level + duration tell you about severity?
Step 4: Apply red-flag screening:
  - Chest pain + dyspnea + diaphoresis → ACS/PE until proven otherwise
  - Severe headache + neuro deficit → stroke, bleed
  - Fever + neck stiffness + photophobia → meningitis
  - Abdominal pain + fever + rigidity → surgical abdomen
  - Back pain + saddle anesthesia / urinary retention → cauda equina
Step 5: What's the single most likely diagnosis given symptoms + demographics + history?
Step 6: What 2-4 rival diagnoses must be ruled OUT (especially dangerous ones)?
Step 7: What single test confirms/excludes each?
Step 8: Any medication conflicts with likely treatments?

# EXAMPLE OF GOOD OUTPUT

INPUT:
- Chief Complaint: sharp chest pain that gets worse when I breathe deeply
- Duration: 4_7_days
- Pain: 7/10
- Medications: lisinopril 10mg daily
- Allergies: penicillin
- Conditions: Hypertension

OUTPUT:
{
  "suggestedSpecialty": "Cardiology",
  "urgencyLevel": "urgent",
  "summary": "Hypertensive adult on lisinopril presenting with 4-7 day history of pleuritic chest pain at 7/10 severity. Pleuritic quality + hypertension history raises concern for PE; must also exclude pericarditis and cardiac ischemia.",
  "possibleConditions": [
    "Pulmonary embolism",
    "Acute pericarditis",
    "Community-acquired pneumonia with pleurisy",
    "Musculoskeletal chest wall pain (costochondritis)",
    "Pleurisy secondary to viral infection"
  ],
  "recommendedTests": [
    "D-dimer",
    "CT pulmonary angiography (if D-dimer positive)",
    "ECG (12-lead)",
    "Chest X-ray PA/Lateral",
    "Troponin I",
    "Complete Blood Count (CBC)"
  ],
  "flags": [
    "Pleuritic chest pain + risk factors requires PE workup — do NOT anchor on MSK pain",
    "Penicillin allergy — avoid beta-lactams if pneumonia confirmed; consider azithromycin or doxycycline",
    "Patient on lisinopril — check renal function before IV contrast for CTPA"
  ]
}

Now analyze the actual intake below and return JSON matching the same pattern: specific, referenced to THIS patient, clinically useful.`;

    const userPrompt = [
      "## Patient Intake",
      `**Chief Complaint:** ${args.chiefComplaint}`,
      `**Symptom Duration:** ${args.symptomDuration}`,
      `**Pain Level:** ${args.painLevel}/10`,
      `**Current Medications:** ${args.medications || "None reported"}`,
      `**Known Allergies:** ${args.allergies || "None reported"}`,
      `**Pre-existing Conditions:** ${args.conditions.length > 0 ? args.conditions.join(", ") : "None reported"}`,
      args.ocrText ? `\n## Extracted Document Text (from uploaded medical records)\n${args.ocrText}` : "",
      "",
      "Produce the structured triage output now. Remember: be specific, clinically useful, and reference THIS patient's data.",
    ].join("\n");

    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intake_analysis",
          strict: true,
          schema: analysisJsonSchema,
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    return JSON.parse(content) as {
      suggestedSpecialty: string;
      urgencyLevel: string;
      summary: string;
      possibleConditions: string[];
      recommendedTests: string[];
      flags: string[];
    };
  },
});

// --- Structured field extraction from raw OCR text ---

const extractedFieldsSchema = {
  type: "object",
  properties: {
    patientInfo: {
      type: "object",
      properties: {
        name: { type: ["string", "null"], description: "Patient full name if found in the document, otherwise null" },
        dateOfBirth: { type: ["string", "null"], description: "Date of birth if found, in any format, otherwise null" },
        mrn: { type: ["string", "null"], description: "Medical record number if found, otherwise null" },
      },
      required: ["name", "dateOfBirth", "mrn"],
      additionalProperties: false,
    },
    labResults: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Test name (e.g. Hemoglobin, Glucose)" },
          value: { type: "string", description: "Measured value as a string" },
          unit: { type: ["string", "null"], description: "Unit of measure (e.g. g/dL, mg/dL), or null" },
          referenceRange: { type: ["string", "null"], description: "Normal range if reported, or null" },
        },
        required: ["name", "value", "unit", "referenceRange"],
        additionalProperties: false,
      },
      description: "Every lab/test result mentioned. Empty array if none.",
    },
    medicationsMentioned: {
      type: "array",
      items: { type: "string" },
      description: "Medications referenced anywhere in the document (with dosage if available, e.g. 'Lisinopril 10mg'). Empty array if none.",
    },
    diagnoses: {
      type: "array",
      items: { type: "string" },
      description: "Diagnoses, impressions, or findings mentioned. Empty array if none.",
    },
    notes: {
      type: "string",
      description: "Any free-text clinical notes or remarks the document contains. Empty string if none.",
    },
  },
  required: ["patientInfo", "labResults", "medicationsMentioned", "diagnoses", "notes"],
  additionalProperties: false,
};

export const extractDocumentFields = action({
  args: { ocrText: v.string() },
  handler: async (_ctx, args) => {
    const client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    });

    const systemPrompt = `You are a medical record parser. You receive raw OCR text from a patient's uploaded medical document (lab report, prescription, consultation note, imaging report, etc.) and extract structured fields.

RULES:
1. Only extract what is actually present in the text. If a field isn't there, return null (for objects) or empty array/string.
2. Do NOT invent or infer values not present in the text.
3. For lab results: capture every numeric measurement with its unit and reference range when given.
4. For medications: include dosage if mentioned (e.g. "Lisinopril 10mg daily").
5. Strip OCR noise (random characters, broken line breaks) when constructing values, but never fabricate.

Return strictly the JSON shape requested.`;

    const userPrompt = `OCR text from medical document:\n\n${args.ocrText}\n\nExtract structured fields.`;

    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "document_extraction",
          strict: true,
          schema: extractedFieldsSchema,
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    // Convert nulls to undefined to match Convex validators (v.optional doesn't accept null)
    const parsed = JSON.parse(content) as {
      patientInfo: { name: string | null; dateOfBirth: string | null; mrn: string | null };
      labResults: Array<{ name: string; value: string; unit: string | null; referenceRange: string | null }>;
      medicationsMentioned: string[];
      diagnoses: string[];
      notes: string;
    };

    return {
      patientInfo: {
        name: parsed.patientInfo.name ?? undefined,
        dateOfBirth: parsed.patientInfo.dateOfBirth ?? undefined,
        mrn: parsed.patientInfo.mrn ?? undefined,
      },
      labResults: parsed.labResults.map((r) => ({
        name: r.name,
        value: r.value,
        unit: r.unit ?? undefined,
        referenceRange: r.referenceRange ?? undefined,
      })),
      medicationsMentioned: parsed.medicationsMentioned,
      diagnoses: parsed.diagnoses,
      notes: parsed.notes,
    };
  },
});
