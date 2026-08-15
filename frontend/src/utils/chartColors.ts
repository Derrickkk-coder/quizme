export const CHART_COLORS = ["#4f46e5", "#0d9488", "#f59e0b", "#ec4899", "#3b82f6", "#84cc16"];

export function colorForIndex(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length];
}

export function colorForPercent(pct: number): string {
  if (pct >= 70) return "#16a34a";
  if (pct >= 50) return "#f59e0b";
  return "#dc2626";
}
