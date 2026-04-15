"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";

const analysisSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    suggestedSpecialty: { type: SchemaType.STRING, description: "Most relevant medical specialty" },
    urgencyLevel: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["routine", "urgent", "emergency"],
      description: "How urgently the patient should be seen",
    },
    summary: { type: SchemaType.STRING, description: "2-3 sentence clinical summary" },
    possibleConditions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Top 3-5 possible conditions based on symptoms",
    },
    recommendedTests: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Recommended diagnostic tests or procedures",
    },
    flags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Red flags or warnings for the doctor to note",
    },
  },
  required: [
    "suggestedSpecialty", "urgencyLevel", "summary",
    "possibleConditions", "recommendedTests", "flags",
  ],
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
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
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

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as {
      suggestedSpecialty: string;
      urgencyLevel: string;
      summary: string;
      possibleConditions: string[];
      recommendedTests: string[];
      flags: string[];
    };
  },
});
