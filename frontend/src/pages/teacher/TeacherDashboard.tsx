import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpenCheck, Library, Users, ClipboardCheck, PlusCircle } from "lucide-react";
import { getTeacherOverview, listTeacherQuizzes, listTeacherResults } from "../../api/teacher";
import { StatCard } from "../../components/ui/StatCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { QuizStatusBadge } from "../../components/ui/StatusBadge";
import { formatDateTime, formatPercent } from "../../utils/format";
import { useAuth } from "../../context/AuthContext";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const overviewQuery = useQuery({ queryKey: ["teacher", "overview"], queryFn: getTeacherOverview });
  const quizzesQuery = useQuery({ queryKey: ["teacher", "quizzes", "active"], queryFn: () => listTeacherQuizzes({ status: "ACTIVE", pageSize: 5 }) });
  const resultsQuery = useQuery({ queryKey: ["teacher", "results", "recent"], queryFn: () => listTeacherResults({ pageSize: 5 }) });

  if (overviewQuery.isLoading) return <PageLoader />;
  const overview = overviewQuery.data?.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Welcome back, {user?.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-ink-500">Here's an overview of your quizzes and classes.</p>
        </div>
        <Link to="/app/teacher/quizzes/new" className="btn-primary">
          <PlusCircle className="h-4 w-4" /> Create Quiz
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total quizzes" value={overview?.quizCount ?? 0} icon={<BookOpenCheck className="h-5 w-5" />} accent="brand" />
        <StatCard label="Question bank" value={overview?.questionCount ?? 0} icon={<Library className="h-5 w-5" />} accent="accent" />
        <StatCard label="Classes taught" value={overview?.classCount ?? 0} icon={<Users className="h-5 w-5" />} accent="amber" />
        <StatCard label="Total submissions" value={overview?.attemptCount ?? 0} icon={<ClipboardCheck className="h-5 w-5" />} accent="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Active quizzes" action={<Link to="/app/teacher/quizzes" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>}>
          {!quizzesQuery.data?.data.length ? (
            <EmptyState title="No active quizzes" description="Publish a quiz to see it here." />
          ) : (
            <ul className="space-y-3">
              {quizzesQuery.data.data.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 p-3">
                  <div className="min-w-0">
                    <Link to={`/app/teacher/quizzes/${q.id}/edit`} className="truncate text-sm font-medium text-ink-800 hover:text-brand-600">
                      {q.title}
                    </Link>
                    <p className="text-xs text-ink-400">
                      {q.subject.name} · {q.class.name} · {q._count?.attempts ?? 0} submission{q._count?.attempts === 1 ? "" : "s"}
                    </p>
                  </div>
                  <QuizStatusBadge status={q.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent submissions" action={<Link to="/app/teacher/results" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>}>
          {!resultsQuery.data?.data.length ? (
            <EmptyState title="No submissions yet" />
          ) : (
            <ul className="space-y-3">
              {resultsQuery.data.data.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800">{r.student?.user.name}</p>
                    <p className="text-xs text-ink-400">
                      {r.quiz.title} · {formatDateTime(r.submittedAt)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-ink-700">{formatPercent(r.percentage)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
