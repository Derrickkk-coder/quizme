import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Award, Clock, Target } from "lucide-react";
import { getStudentPerformanceSummary } from "../../api/student";
import { PageLoader } from "../../components/ui/Spinner";
import { StatCard } from "../../components/ui/StatCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { SubjectBarChart } from "../../components/charts/SubjectBarChart";
import { TrendLineChart } from "../../components/charts/TrendLineChart";
import { GradeDistributionChart } from "../../components/charts/GradeDistributionChart";
import { formatPercent } from "../../utils/format";

export default function PerformancePage() {
  const { data, isLoading } = useQuery({ queryKey: ["student", "performance", "summary"], queryFn: getStudentPerformanceSummary });

  if (isLoading) return <PageLoader />;
  const p = data?.data;
  if (!p) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">My Performance</h1>
        <p className="mt-1 text-sm text-ink-500">A breakdown of how you're doing across subjects and quizzes.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Overall average" value={formatPercent(p.overallAverage)} icon={<TrendingUp className="h-5 w-5" />} accent="brand" />
        <StatCard label="Best score" value={formatPercent(p.bestScore)} icon={<Award className="h-5 w-5" />} accent="accent" />
        <StatCard label="Quizzes completed" value={p.attemptsCount} icon={<Target className="h-5 w-5" />} accent="amber" />
        <StatCard label="Avg. completion time" value={`${p.avgCompletionMinutes} min`} icon={<Clock className="h-5 w-5" />} accent="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Subject performance">
          <SubjectBarChart data={p.subjectPerformance} />
        </SectionCard>
        <SectionCard title="Progress over time">
          <TrendLineChart data={p.trend} />
        </SectionCard>
      </div>

      <SectionCard title="Grades in your class">
        <p className="mb-4 -mt-2 text-sm text-ink-500">How your overall grade compares to your classmates'.</p>
        <GradeDistributionChart data={p.gradeDistribution} myGrade={p.myGrade} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Strengths">
          {!p.strengths.length ? (
            <EmptyState title="No data yet" />
          ) : (
            <ul className="space-y-3">
              {p.strengths.map((s) => (
                <li key={s.topic} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-700">{s.topic}</span>
                  <span className="badge-green">{formatPercent(s.correctRate)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Areas to improve">
          {!p.weaknesses.length ? (
            <EmptyState title="No data yet" />
          ) : (
            <ul className="space-y-3">
              {p.weaknesses.map((s) => (
                <li key={s.topic} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-700">{s.topic}</span>
                  <span className="badge-red">{formatPercent(s.correctRate)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
