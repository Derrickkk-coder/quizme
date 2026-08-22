import { useTheme } from "../context/ThemeContext";

export interface ChartTheme {
  grid: string;
  tick: string;
  tooltipBg: string;
  tooltipBorder: string;
}

const LIGHT: ChartTheme = { grid: "#e2e8f0", tick: "#64748b", tooltipBg: "#ffffff", tooltipBorder: "#e2e8f0" };
const DARK: ChartTheme = { grid: "#293349", tick: "#94a3b8", tooltipBg: "#151d2e", tooltipBorder: "#293349" };

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? DARK : LIGHT;
}
