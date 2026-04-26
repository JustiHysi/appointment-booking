"use client";

import { useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Label, Select, Textarea } from "../../../components/ui/input";
import { ProgressBar } from "../../../components/ui/progress-bar";

const SPECIALTIES = [
  "General Practice", "Cardiology", "Dermatology", "Neurology",
  "Orthopedics", "Pediatrics", "Psychiatry", "Ophthalmology", "ENT", "Other",
];
const DURATIONS = [
  { value: "less_than_day", label: "Less than a day" },
  { value: "1_3_days", label: "1\u20133 days" },
  { value: "4_7_days", label: "4\u20137 days" },
  { value: "1_2_weeks", label: "1\u20132 weeks" },
  { value: "2_4_weeks", label: "2\u20134 weeks" },
  { value: "more_than_month", label: "More than a month" },
];
const CONDITIONS = [
  "Diabetes", "Hypertension", "Asthma", "Heart Disease",
  "Arthritis", "Depression", "Anxiety", "None",
];
const STEPS = ["Specialty", "Health Form", "Documents", "Review", "Find Doctor"];

interface FormData {
  specialty: string;
  chiefComplaint: string;
  symptomDuration: string;
  painLevel: number;
  medications: string;
  allergies: string;
  conditions: string[];
  docIds: Id<"_storage">[];
  docNames: string[];
  docFiles: File[];
  ocrText: string;
}

export default function IntakePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    specialty: "", chiefComplaint: "", symptomDuration: "", painLevel: 5,
    medications: "", allergies: "", conditions: [], docIds: [], docNames: [],
    docFiles: [], ocrText: "",
  });

  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    suggestedSpecialty: string; urgencyLevel: string; summary: string;
    possibleConditions: string[]; recommendedTests: string[]; flags: string[];
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const createIntake = useMutation(api.intake.createHealthIntake);      
  const saveAiAnalysis = useMutation(api.intake.setAiAnalysis);
  const generateUploadUrl = useMutation(api.doctors.generateUploadUrl);
  const analyzeIntake = useAction(api.ai.analyzeIntake);

  const set = (u: Partial<FormData>) => setForm((p) => ({ ...p, ...u }));

  const canAdvance =
    step === 0 ? form.specialty !== "" :
    step === 1 ? form.chiefComplaint.trim().length > 0 && form.symptomDuration !== "" :
    true;

  async function advanceFromDocuments() {
    const images = form.docFiles.filter((f) => f.type.startsWith("image/"));
    const pdfs = form.docFiles.filter((f) => f.type === "application/pdf");

    if (images.length === 0 && pdfs.length === 0) { setStep(3); return; }

    setOcrProcessing(true);
    const texts: string[] = [];
    try {
      if (images.length > 0) {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        for (const file of images) {
          const { data } = await worker.recognize(file);
          if (data.text.trim()) texts.push(data.text.trim());
        }
        await worker.terminate();
      }

      if (pdfs.length > 0) {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        // Lazy-init Tesseract worker for scanned PDFs (reuse if already created above)
        let ocrWorker: Awaited<ReturnType<typeof import("tesseract.js")["createWorker"]>> | null = null;

        for (const file of pdfs) {
          const buffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);

            // Try text layer first (digital PDFs)
            const content = await page.getTextContent();
            const digitalText = content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" ")
              .trim();

            if (digitalText.length > 20) {
              texts.push(digitalText);
              continue;
            }

            // Scanned PDF — render page to canvas and OCR it
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await page.render({ canvasContext: ctx, viewport } as any).promise;

            if (!ocrWorker) {
              const { createWorker } = await import("tesseract.js");
              ocrWorker = await createWorker("eng");
            }
            const { data } = await ocrWorker.recognize(canvas);
            if (data.text.trim()) texts.push(data.text.trim());
          }
        }

        if (ocrWorker) await ocrWorker.terminate();
      }

      const ocrText = texts.join("\n\n---\n\n");
      set({ ocrText });
      if (ocrText) toast.success("Text extraction complete!");
      else toast.info("No text found in uploaded documents");
    } catch {
      toast.error("Text extraction failed — you can still continue");
    } finally {
      setOcrProcessing(false);
      setStep(3);
      runAiAnalysis(texts.join("\n\n---\n\n"));
    }
  }

  async function runAiAnalysis(extractedText: string) {
    setAiLoading(true);
    try {
      const result = await analyzeIntake({
        chiefComplaint: form.chiefComplaint,
        symptomDuration: form.symptomDuration,
        painLevel: form.painLevel,
        medications: form.medications,
        allergies: form.allergies,
        conditions: form.conditions,
        ocrText: extractedText || undefined,
      });
      setAiAnalysis(result);
      if (result.suggestedSpecialty) {
        set({ specialty: result.suggestedSpecialty });
      }
      toast.success("AI analysis complete!");
    } catch {
      toast.error("AI analysis failed — you can still continue manually");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const id = await createIntake({
        chiefComplaint: form.chiefComplaint, symptomDuration: form.symptomDuration,
        painLevel: form.painLevel, medications: form.medications, allergies: form.allergies,
        conditions: form.conditions, documents: form.docIds,
        ocrText: form.ocrText || undefined,
      });
      if (aiAnalysis) {
        await saveAiAnalysis({ intakeId: id, aiAnalysis });
      }
      toast.success("Health intake saved!");
      router.push(`/dashboard/doctors?specialty=${encodeURIComponent(form.specialty)}&intakeId=${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save intake");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Book an Appointment</h1>
      <p className="mt-1 text-sm text-slate-500">Complete the health intake to find the right doctor</p>

      <ProgressBar currentStep={step} labels={STEPS} />

      <div className="mt-6">
        {step === 0 && <SpecialtyPicker value={form.specialty} onChange={(v) => set({ specialty: v })} />}
        {step === 1 && <HealthForm form={form} set={set} />}
        {step === 2 && <DocUpload form={form} set={set} generateUrl={generateUploadUrl} />}
        {step === 3 && <Review form={form} onEdit={setStep} aiAnalysis={aiAnalysis} aiLoading={aiLoading} />}
      </div>

      <div className="mt-6 flex justify-between">
        {step > 0 && step < 4 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}
        <div className="ml-auto">
          {step < 3 && (
            <Button
              onClick={step === 2 ? advanceFromDocuments : () => setStep(step + 1)}
              disabled={!canAdvance || ocrProcessing}
            >
              {ocrProcessing ? "Extracting text..." : step === 2 && form.docIds.length === 0 ? "Skip" : "Next"}
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Saving..." : "Confirm & Find Doctors"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Step Components ---

function SpecialtyPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">What type of doctor do you need?</h2>
      <p className="mt-1 text-sm text-slate-500">Select the specialty that best matches your needs</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SPECIALTIES.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
              value === s
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </Card>
  );
}

function HealthForm({ form, set }: { form: FormData; set: (u: Partial<FormData>) => void }) {
  function toggleCondition(c: string) {
    if (c === "None") { set({ conditions: form.conditions.includes("None") ? [] : ["None"] }); return; }
    const without = form.conditions.filter((x) => x !== "None");
    set({ conditions: without.includes(c) ? without.filter((x) => x !== c) : [...without, c] });
  }

  const painColor = form.painLevel <= 3 ? "text-green-600" : form.painLevel <= 6 ? "text-yellow-600" : "text-red-600";

  return (
    <Card className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">Tell us about your health</h2>

      <div>
        <Label>Chief Complaint *</Label>
        <Textarea value={form.chiefComplaint} onChange={(e) => set({ chiefComplaint: e.target.value })}
          rows={3} required placeholder="Describe your main health concern..." className="mt-1.5" />
      </div>

      <div>
        <Label>Symptom Duration *</Label>
        <Select value={form.symptomDuration} onChange={(e) => set({ symptomDuration: e.target.value })}
          required className="mt-1.5">
          <option value="">Select duration...</option>
          {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </Select>
      </div>

      <div>
        <Label>Pain Level: <span className={`font-bold ${painColor}`}>{form.painLevel}/10</span></Label>
        <input type="range" min={1} max={10} value={form.painLevel}
          onChange={(e) => set({ painLevel: Number(e.target.value) })} className="mt-1.5 w-full accent-emerald-600" />
        <div className="flex justify-between text-xs text-slate-400">
          <span>Mild</span><span>Moderate</span><span>Severe</span>
        </div>
      </div>

      <div>
        <Label>Current Medications</Label>
        <Textarea value={form.medications} onChange={(e) => set({ medications: e.target.value })}
          rows={2} placeholder="List current medications, or write None" className="mt-1.5" />
      </div>

      <div>
        <Label>Allergies</Label>
        <Textarea value={form.allergies} onChange={(e) => set({ allergies: e.target.value })}
          rows={2} placeholder="List known allergies, or write None" className="mt-1.5" />
      </div>

      <div>
        <Label>Pre-existing Conditions</Label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {CONDITIONS.map((c) => (
            <label key={c} className={`flex cursor-pointer items-center rounded-xl border px-3 py-2 text-sm transition-all ${
              form.conditions.includes(c) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}>
              <input type="checkbox" checked={form.conditions.includes(c)} onChange={() => toggleCondition(c)} className="sr-only" />
              {c}
            </label>
          ))}
        </div>
      </div>
    </Card>
  );
}

function DocUpload({ form, set, generateUrl }: { form: FormData; set: (u: Partial<FormData>) => void; generateUrl: () => Promise<string> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList) {
    setUploading(true);
    const ids = [...form.docIds];
    const names = [...form.docNames];
    const rawFiles = [...form.docFiles];
    try {
      await Promise.all(Array.from(files).map(async (f) => {
        if (!f.type.startsWith("image/") && f.type !== "application/pdf") { toast.error(`${f.name}: Only images and PDFs`); return; }
        if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: Max 10MB`); return; }
        const url = await generateUrl();
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": f.type }, body: f });
        const { storageId } = await res.json();
        ids.push(storageId); names.push(f.name); rawFiles.push(f);
      }));
      set({ docIds: ids, docNames: names, docFiles: rawFiles });
      if (ids.length > form.docIds.length) toast.success("Files uploaded!");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Upload Documents</h2>
      <p className="mt-1 text-sm text-slate-500">Upload medical records, test results, or images (optional)</p>

      <input ref={ref} type="file" accept="image/*,.pdf" multiple onChange={(e) => e.target.files && upload(e.target.files)} className="hidden" />
      <button onClick={() => ref.current?.click()} disabled={uploading}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-sm font-medium text-slate-500 transition-colors hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-50">
        {uploading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />Uploading...</> : "Click to upload images or PDFs"}
      </button>

      {form.docNames.length > 0 && (
        <div className="mt-4 space-y-2">
          {form.docNames.map((name, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
              <span className="truncate text-sm text-slate-700">{name}</span>
              <button onClick={() => set({ docIds: form.docIds.filter((_, j) => j !== i), docNames: form.docNames.filter((_, j) => j !== i), docFiles: form.docFiles.filter((_, j) => j !== i) })}
                className="text-sm font-medium text-red-600 hover:text-red-700">Remove</button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

type AiResult = { suggestedSpecialty: string; urgencyLevel: string; summary: string; possibleConditions: string[]; recommendedTests: string[]; flags: string[] };

function Review({ form, onEdit, aiAnalysis, aiLoading }: { form: FormData; onEdit: (step: number) => void; aiAnalysis: AiResult | null; aiLoading: boolean }) {
  const painColor = form.painLevel <= 3 ? "bg-green-500" : form.painLevel <= 6 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Review Your Information</h2>
        <div className="mt-4 space-y-4">
          <Row label="Specialty" value={form.specialty} onEdit={() => onEdit(0)} />
          <hr className="border-slate-200" />
          <Row label="Chief Complaint" value={form.chiefComplaint} onEdit={() => onEdit(1)} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Symptom Duration" value={DURATIONS.find((d) => d.value === form.symptomDuration)?.label ?? form.symptomDuration} />
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Pain Level</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-slate-200">
                  <div className={`h-2 rounded-full ${painColor}`} style={{ width: `${form.painLevel * 10}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-900">{form.painLevel}/10</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Medications" value={form.medications || "None"} />
            <Field label="Allergies" value={form.allergies || "None"} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-slate-400">Conditions</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {form.conditions.length > 0
                ? form.conditions.map((c) => <span key={c} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{c}</span>)
                : <span className="text-sm text-slate-500">None</span>}
            </div>
          </div>
          <Field label="Documents" value={`${form.docIds.length} file(s) uploaded`} />
        </div>
      </Card>

      {form.ocrText && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900">Extracted Text (OCR)</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{form.ocrText}</p>
        </Card>
      )}

      {aiLoading && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-600">AI is analyzing your health data...</p>
          </div>
        </Card>
      )}

      {aiAnalysis && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-900">AI Analysis</h3>
          <div className="mt-3 space-y-3">
            <div className="flex gap-3">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                aiAnalysis.urgencyLevel === "emergency" ? "bg-red-100 text-red-700" :
                aiAnalysis.urgencyLevel === "urgent" ? "bg-yellow-100 text-yellow-700" :
                "bg-green-100 text-green-700"
              }`}>{aiAnalysis.urgencyLevel}</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                {aiAnalysis.suggestedSpecialty}
              </span>
            </div>
            <p className="text-sm text-slate-700">{aiAnalysis.summary}</p>
            {aiAnalysis.possibleConditions.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Possible Conditions</p>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
                  {aiAnalysis.possibleConditions.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </div>
            )}
            {aiAnalysis.recommendedTests.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">Recommended Tests</p>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
                  {aiAnalysis.recommendedTests.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            )}
            {aiAnalysis.flags.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase text-red-400">Flags</p>
                <ul className="mt-1 list-inside list-disc text-sm text-red-600">
                  {aiAnalysis.flags.map((f) => <li key={f}>{f}</li>)}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {!aiAnalysis && !aiLoading && (
        <div className="rounded-2xl bg-slate-100 p-5 ring-1 ring-slate-200/60">
          <p className="text-sm font-medium text-slate-500">AI analysis unavailable. You can still continue.</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between">
      <Field label={label} value={value} />
      <button onClick={onEdit} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">Edit</button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="text-sm text-slate-900">{value}</p>
    </div>
  );
}
