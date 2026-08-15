import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  accent?: "brand" | "accent" | "amber" | "red";
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  brand: "bg-brand-50 text-brand-600",
  accent: "bg-accent-50 text-accent-600",
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
};

export function StatCard({ label, value, icon, hint, accent = "brand" }: StatCardProps) {
  return (
    <div className="card flex items-start justify-between gap-3 p-5">
      <div>
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      </div>
      {icon && <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentClasses[accent]}`}>{icon}</div>}
    </div>
  );
}
