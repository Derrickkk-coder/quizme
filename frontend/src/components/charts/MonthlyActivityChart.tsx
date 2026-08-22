import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useChartTheme } from "../../utils/useChartTheme";
import { useTheme } from "../../context/ThemeContext";

interface DataPoint {
  month: string;
  attempts: number;
}

export function MonthlyActivityChart({ data, height = 240 }: { data: DataPoint[]; height?: number }) {
  const theme = useChartTheme();
  const { resolvedTheme } = useTheme();
  const lineColor = resolvedTheme === "dark" ? "#818cf8" : "#4f46e5";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -20, bottom: 8 }}>
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.tick }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: theme.tick }} />
        <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${theme.tooltipBorder}`, backgroundColor: theme.tooltipBg, fontSize: 13 }} labelStyle={{ color: theme.tick }} />
        <Area type="monotone" dataKey="attempts" stroke={lineColor} strokeWidth={2.5} fill="url(#activityFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
