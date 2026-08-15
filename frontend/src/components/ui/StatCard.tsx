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
    <div className="card flex items-start justify-between gap-2 p-3 sm:gap-3 sm:p-5">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-ink-500 sm:text-sm">{label}</p>
        <p className="mt-0.5 text-lg font-bold text-ink-900 sm:mt-1 sm:text-2xl">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
      </div>
      {icon && (
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${accentClasses[accent]}`}
        >
          {icon}
        </div>
      )}
    </div>
  );
}
