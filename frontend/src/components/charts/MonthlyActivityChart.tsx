import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DataPoint {
  month: string;
  attempts: number;
}

export function MonthlyActivityChart({ data, height = 240 }: { data: DataPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -20, bottom: 8 }}>
        <defs>
          <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }} />
        <Area type="monotone" dataKey="attempts" stroke="#4f46e5" strokeWidth={2.5} fill="url(#activityFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
