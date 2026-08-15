interface ProgressBarProps {
  value: number;
  max?: number;
  colorClass?: string;
  trackClass?: string;
  size?: "sm" | "md";
}

export function ProgressBar({ value, max = 100, colorClass = "bg-brand-600", trackClass = "bg-ink-100", size = "md" }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`w-full overflow-hidden rounded-full ${trackClass} ${size === "sm" ? "h-1.5" : "h-2.5"}`}>
      <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
