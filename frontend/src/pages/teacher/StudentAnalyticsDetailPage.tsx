import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Award, Clock, Target, TrendingUp } from "lucide-react";
import { getStudentAnalytics } from "../../api/teacher";
import { PageLoader } from "../../components/ui/Spinner";
import { StatCard } from "../../components/ui/StatCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { SubjectBarChart } from "../../components/charts/SubjectBarChart";
import { TrendLineChart } from "../../components/charts/TrendLineChart";
import { formatPercent } from "../../utils/format";

export default function StudentAnalyticsDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["teacher", "analytics", "student", studentId],
    queryFn: () => getStudentAnalytics(studentId!),
    enabled: !!studentId,
  });

  if (isLoading) return <PageLoader />;
  const p = data?.data;
  if (!p) return null;

  return (
    <div className="space-y-6">
      <Link to="/app/teacher/analytics" className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to analytics
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-ink-900">{p.student.name}</h1>
        <p className="mt-1 text-sm text-ink-500">{p.student.studentCode} · {p.student.class}</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Strengths">
          {!p.strengths.length ? <EmptyState title="No data yet" /> : (
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
        <SectionCard title="Areas needing improvement">
          {!p.weaknesses.length ? <EmptyState title="No data yet" /> : (
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
