import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "../ui/EmptyState";

interface DataPoint {
  quizTitle: string;
  date: string;
  percentage: number;
}

export function TrendLineChart({ data, height = 260 }: { data: DataPoint[]; height?: number }) {
  if (!data.length) return <EmptyState title="No trend data yet" description="Take a few quizzes to see your progress over time." />;

  const points = data.map((d, i) => ({ name: `#${i + 1}`, percentage: Math.round(d.percentage), quizTitle: d.quizTitle }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 8, right: 16, left: -20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} />
        <Tooltip
          formatter={(value: number) => [`${value}%`, "Score"]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.quizTitle ?? ""}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <Line type="monotone" dataKey="percentage" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4, fill: "#4f46e5" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
