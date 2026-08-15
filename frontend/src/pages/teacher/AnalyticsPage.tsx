import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Users, Target, TrendingUp, Clock } from "lucide-react";
import { getQuizAnalytics, getTeacherStudents, listTeacherQuizzes } from "../../api/teacher";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { StatCard } from "../../components/ui/StatCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { SimplePieChart } from "../../components/charts/SimplePieChart";
import { formatPercent } from "../../utils/format";
import { QuizAnalytics } from "../../types";

export default function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const quizId = searchParams.get("quizId") ?? "";
  const navigate = useNavigate();
  const [studentSearch, setStudentSearch] = useState("");

  const quizzesQuery = useQuery({ queryKey: ["teacher", "quizzes", "analytics-picker"], queryFn: () => listTeacherQuizzes({ pageSize: 100 }) });
  const studentsQuery = useQuery({ queryKey: ["teacher", "students", "all"], queryFn: () => getTeacherStudents() });

  const publishedQuizzes = (quizzesQuery.data?.data ?? []).filter((q) => q.status !== "DRAFT");

  useEffect(() => {
    if (!quizId && publishedQuizzes.length) {
      setSearchParams({ quizId: publishedQuizzes[0].id });
    }
  }, [quizId, publishedQuizzes, setSearchParams]);

  const analyticsQuery = useQuery({
    queryKey: ["teacher", "analytics", "quiz", quizId],
    queryFn: () => getQuizAnalytics(quizId),
    enabled: !!quizId,
  });

  const filteredStudents = (studentsQuery.data?.data ?? []).filter((s) => s.user.name.toLowerCase().includes(studentSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Analytics</h1>
        <p className="mt-1 text-sm text-ink-500">Class performance for a specific quiz, or look up an individual student.</p>
      </div>

      <div className="card p-4">
        <label className="label">Select a quiz</label>
        <select className="select max-w-md" value={quizId} onChange={(e) => setSearchParams({ quizId: e.target.value })}>
          {publishedQuizzes.map((q) => (
            <option key={q.id} value={q.id}>{q.title} — {q.class.name}</option>
          ))}
        </select>
      </div>

      {!quizId ? (
        <EmptyState title="No published quizzes yet" description="Analytics appear once a quiz has been published." />
      ) : analyticsQuery.isLoading ? (
        <PageLoader />
      ) : analyticsQuery.data ? (
        <QuizAnalyticsView data={analyticsQuery.data.data} />
      ) : null}

      <SectionCard title="Look up a student">
        <input className="input mb-4 max-w-md" placeholder="Search by name…" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.slice(0, 12).map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/app/teacher/analytics/student/${s.id}`)}
              className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 text-left text-sm hover:border-brand-300 hover:bg-brand-50"
            >
              <Users className="h-4 w-4 text-ink-400" />
              {s.user.name}
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function QuizAnalyticsView({ data }: { data: QuizAnalytics }) {
  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="text-lg font-bold text-ink-900">
          {data.quiz.subject.toUpperCase()} — {data.quiz.class}
        </h2>
        <p className="text-sm text-ink-500">{data.quiz.title}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Students" value={data.totalStudents} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Average" value={formatPercent(data.average)} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Pass rate" value={formatPercent(data.passRate)} icon={<Target className="h-4 w-4" />} accent="accent" />
        <StatCard label="Highest" value={formatPercent(data.highest)} accent="accent" />
        <StatCard label="Lowest" value={formatPercent(data.lowest)} accent="red" />
        <StatCard label="Avg. time" value={`${data.avgCompletionMinutes}m`} icon={<Clock className="h-4 w-4" />} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Completion">
          <SimplePieChart
            data={[
              { name: "Completed", value: data.completedCount, color: "#4f46e5" },
              { name: "Not attempted", value: data.notAttempted, color: "#e2e8f0" },
            ]}
          />
        </SectionCard>
        <SectionCard title="Pass / Fail">
          <SimplePieChart
            data={[
              { name: "Pass", value: Math.round((data.passRate / 100) * data.completedCount), color: "#16a34a" },
              { name: "Fail", value: Math.round((data.failRate / 100) * data.completedCount), color: "#dc2626" },
            ]}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Weakest topics">
          {!data.weakestTopics.length ? (
            <EmptyState title="No data yet" />
          ) : (
            <ul className="space-y-2">
              {data.weakestTopics.map((t) => (
                <li key={t.topic} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{t.topic}</span>
                  <span className="badge-red">{formatPercent(t.correctRate)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Most missed questions">
          {!data.mostMissed.length ? (
            <EmptyState title="No data yet" />
          ) : (
            <ul className="space-y-2">
              {data.mostMissed.map((q) => (
                <li key={q.questionId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="line-clamp-1 text-ink-700">{q.text}</span>
                  <span className="badge-amber shrink-0">{formatPercent(q.correctRate)} correct</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
