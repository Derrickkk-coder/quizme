import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "../ui/EmptyState";

interface DataPoint {
  grade: string;
  count: number;
}

const COLOR_MINE = "#60a5fa";
const COLOR_OTHERS = "#1d4ed8";

export function GradeDistributionChart({ data, myGrade, height = 260 }: { data: DataPoint[]; myGrade: string | null; height?: number }) {
  if (!data.length || data.every((d) => d.count === 0)) {
    return <EmptyState title="No class data yet" description="This will fill in once your classmates start submitting quizzes." />;
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 8, left: -20, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="grade" tick={{ fontSize: 12, fill: "#64748b" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
          <Tooltip
            formatter={(value: number, _name, item) => [`${value} student${value === 1 ? "" : "s"}`, item.payload.grade === myGrade ? "Your grade" : "Grade"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => {
              const isMine = d.grade === myGrade;
              return <Cell key={i} fill={isMine ? COLOR_MINE : COLOR_OTHERS} stroke={isMine ? COLOR_OTHERS : "none"} strokeWidth={isMine ? 1.5 : 0} />;
            })}
            <LabelList
              dataKey="grade"
              content={({ x, y, width, index }) => {
                const d = data[index as number];
                if (!d || d.grade !== myGrade) return null;
                const cx = Number(x) + Number(width) / 2;
                return (
                  <text x={cx} y={Number(y) - 8} textAnchor="middle" fontSize={11} fontWeight={600} fill={COLOR_OTHERS}>
                    You
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-1 flex items-center justify-center gap-4 text-xs text-ink-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR_MINE, border: `1.5px solid ${COLOR_OTHERS}` }} />
          Your grade
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: COLOR_OTHERS }} />
          Other grades
        </span>
      </div>
    </div>
  );
}
