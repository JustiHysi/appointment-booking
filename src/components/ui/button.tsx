import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md",
  secondary:
    "border border-slate-300 text-slate-700 hover:bg-slate-50",
  danger:
    "border border-red-300 text-red-600 hover:bg-red-50",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-all disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
