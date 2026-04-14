export function ProgressBar({ currentStep, labels }: { currentStep: number; labels: string[] }) {
  return (
    <div className="mt-6 flex items-center gap-2">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                i < currentStep
                  ? "bg-emerald-600 text-white"
                  : i === currentStep
                    ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {i < currentStep ? "\u2713" : i + 1}
            </div>
            <span className="mt-1 hidden text-xs text-slate-500 sm:block">{label}</span>
          </div>
          {i < labels.length - 1 && (
            <div className={`h-0.5 w-6 sm:w-10 ${i < currentStep ? "bg-emerald-600" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}
