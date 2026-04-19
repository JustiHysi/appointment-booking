"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import OpenAI from "openai";

// Claude Sonnet 4 via OpenRouter — strongest clinical reasoning + reliable
// instruction following for medical triage outputs. Handles sparse intake
// data better than GPT-4o-mini and is less "hedgy" than generic models.
const MODEL = "anthropic/claude-sonnet-4";

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

    const systemPrompt = `You are a board-certified attending physician with 20 years of experience performing pre-consultation triage at a busy hospital. You analyze patient intake data and uploaded medical documents, then produce a concise clinical pre-read for the treating doctor.

CRITICAL RULES — VIOLATIONS WILL MAKE YOUR OUTPUT USELESS:
1. NEVER give generic answers. Every field must reference specifics from THIS patient's data.
2. NEVER pad with filler like "Patient should be evaluated" or "Further tests may be needed" — assume the doctor knows that.
3. NEVER list vague conditions like "infection", "inflammation", or "pain disorder" — use proper ICD-level diagnosis names.
4. NEVER list vague tests like "blood test" or "scan" — name the exact test (CBC, BMP, Troponin I, CT head without contrast, etc.).
5. If the patient data is sparse, your differential should reflect statistically common causes for the reported symptom + age/history if available.
6. For drug interaction flags: actually look at the medications list + allergies list and flag real interactions, don't just say "review medications".

REASON STEP-BY-STEP internally before producing output:
- What is the core symptom? What system does it involve?
- What is the time course (acute / subacute / chronic)?
- What does the pain level (1-10) tell me about severity?
- Do any red-flag combinations exist? (chest pain + sweating, severe headache + neuro deficit, fever + neck stiffness, etc.)
- Which conditions would an experienced clinician reasonably consider FIRST based on this presentation?
- What tests would confirm/exclude each of those conditions?
- Given the current meds and allergies, are there any prescribing constraints?`;

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
