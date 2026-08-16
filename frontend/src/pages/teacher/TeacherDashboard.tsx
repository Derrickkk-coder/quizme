import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpenCheck, Library, Users, ClipboardCheck, PlusCircle, ClipboardList } from "lucide-react";
import { getTeacherOverview, listTeacherQuizzes, listTeacherResults } from "../../api/teacher";
import { StatCard } from "../../components/ui/StatCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { QuizStatusBadge } from "../../components/ui/StatusBadge";
import { DashboardHero } from "../../components/dashboard/DashboardHero";
import { ActivityRow } from "../../components/dashboard/ActivityRow";
import { formatPercent, timeAgo } from "../../utils/format";
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
      <DashboardHero
        eyebrow="Teacher"
        name={user?.name ?? ""}
        subtitle="Here's an overview of your quizzes and classes."
        icon={<ClipboardList className="h-10 w-10" />}
        cta={{ label: "Create Quiz", to: "/app/teacher/quizzes/new", icon: <PlusCircle className="h-4 w-4" /> }}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
            <ul className="space-y-2">
              {quizzesQuery.data.data.map((q) => (
                <ActivityRow
                  key={q.id}
                  to={`/app/teacher/quizzes/${q.id}/edit`}
                  icon={<BookOpenCheck className="h-4 w-4" />}
                  iconClassName="bg-brand-50 text-brand-600"
                  title={q.title}
                  subtitle={`${q.subject.name} · ${q.class.name} · ${q._count?.attempts ?? 0} submission${q._count?.attempts === 1 ? "" : "s"}`}
                  meta={<QuizStatusBadge status={q.status} />}
                />
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent submissions" action={<Link to="/app/teacher/results" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>}>
          {!resultsQuery.data?.data.length ? (
            <EmptyState title="No submissions yet" />
          ) : (
            <ul className="space-y-2">
              {resultsQuery.data.data.map((r) => (
                <ActivityRow
                  key={r.id}
                  to={`/app/teacher/results/${r.id}`}
                  icon={<ClipboardCheck className="h-4 w-4" />}
                  iconClassName="bg-accent-50 text-accent-600"
                  title={r.student?.user.name ?? "Student"}
                  subtitle={r.quiz.title}
                  meta={<span className="text-sm font-semibold text-ink-700">{formatPercent(r.percentage)}</span>}
                  timestamp={timeAgo(r.submittedAt)}
                />
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
