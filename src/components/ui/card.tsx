import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-6 shadow-md ring-1 ring-slate-200/60 ${className}`}>
      {children}
    </div>
  );
}
