"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import OpenAI from "openai";

// OpenRouter is OpenAI-compatible — we use the same SDK with a different baseURL.
// Model choice: gpt-4o-mini via OpenRouter supports structured JSON output reliably.
const MODEL = "openai/gpt-4o-mini";

const analysisJsonSchema = {
  type: "object",
  properties: {
    suggestedSpecialty: {
      type: "string",
      description: "Most relevant medical specialty from: General Practice, Cardiology, Dermatology, Neurology, Orthopedics, Pediatrics, Psychiatry, Ophthalmology, ENT, Other",
    },
    urgencyLevel: {
      type: "string",
      enum: ["routine", "urgent", "emergency"],
      description: "How urgently the patient should be seen",
    },
    summary: {
      type: "string",
      description: "2-3 sentence clinical summary for the doctor",
    },
    possibleConditions: {
      type: "array",
      items: { type: "string" },
      description: "Top 3-5 possible conditions ranked by likelihood",
    },
    recommendedTests: {
      type: "array",
      items: { type: "string" },
      description: "Recommended diagnostic tests or procedures",
    },
    flags: {
      type: "array",
      items: { type: "string" },
      description: "Red flags, drug interactions, or urgent concerns for the doctor",
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

    const prompt = [
      "You are an experienced medical triage assistant at a hospital intake desk.",
      "Your role is to analyze patient-reported symptoms and medical documents to help doctors prepare for consultations.",
      "",
      "## Patient Intake Data",
      `- **Chief Complaint:** ${args.chiefComplaint}`,
      `- **Symptom Duration:** ${args.symptomDuration}`,
      `- **Pain Level:** ${args.painLevel}/10`,
      `- **Current Medications:** ${args.medications || "None reported"}`,
      `- **Known Allergies:** ${args.allergies || "None reported"}`,
      `- **Pre-existing Conditions:** ${args.conditions.length > 0 ? args.conditions.join(", ") : "None reported"}`,
      args.ocrText ? `\n## Extracted Medical Document Text\n${args.ocrText}` : "",
      "",
      "## Instructions",
      "1. For `suggestedSpecialty`: Choose the single most relevant medical specialty from: General Practice, Cardiology, Dermatology, Neurology, Orthopedics, Pediatrics, Psychiatry, Ophthalmology, ENT, or Other.",
      "2. For `urgencyLevel`: Assess based on symptom severity, pain level, and red flags. Use 'emergency' only for life-threatening symptoms.",
      "3. For `summary`: Write a concise 2-3 sentence clinical summary a doctor would find useful before the consultation.",
      "4. For `possibleConditions`: List 3-5 differential diagnoses ranked by likelihood, considering all reported symptoms and medical history.",
      "5. For `recommendedTests`: Suggest specific diagnostic tests (e.g., 'Complete Blood Count', 'Chest X-ray') relevant to the differential diagnoses.",
      "6. For `flags`: List any red flags, drug interaction risks (considering current medications + allergies), or urgent concerns the doctor should be aware of. Return an empty array if none.",
    ].join("\n");

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
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
