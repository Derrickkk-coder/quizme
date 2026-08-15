import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { colorForPercent } from "../../utils/chartColors";
import { EmptyState } from "../ui/EmptyState";

interface DataPoint {
  subject: string;
  averagePercentage: number;
}

export function SubjectBarChart({ data, height = 260 }: { data: DataPoint[]; height?: number }) {
  if (!data.length) return <EmptyState title="No performance data yet" description="Results will appear here once quizzes are completed." />;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="subject" tick={{ fontSize: 12, fill: "#64748b" }} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} />
        <Tooltip
          formatter={(value: number) => [`${value}%`, "Average"]}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
        />
        <Bar dataKey="averagePercentage" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={colorForPercent(d.averagePercentage)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
