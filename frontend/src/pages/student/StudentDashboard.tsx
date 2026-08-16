import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpenCheck, CheckCircle2, TrendingUp, Bell, ArrowRight, Clock, GraduationCap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getStudentQuizzes } from "../../api/student";
import { getStudentPerformanceSummary } from "../../api/student";
import { getStudentResults } from "../../api/student";
import { listNotifications } from "../../api/notifications";
import { StatCard } from "../../components/ui/StatCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { SubjectBarChart } from "../../components/charts/SubjectBarChart";
import { GradeBadge } from "../../components/ui/StatusBadge";
import { DashboardHero } from "../../components/dashboard/DashboardHero";
import { ActivityRow } from "../../components/dashboard/ActivityRow";
import { formatDateTime, formatPercent, timeAgo } from "../../utils/format";

export default function StudentDashboard() {
  const { user } = useAuth();

  const quizzesQuery = useQuery({ queryKey: ["student", "quizzes"], queryFn: getStudentQuizzes });
  const performanceQuery = useQuery({ queryKey: ["student", "performance", "summary"], queryFn: getStudentPerformanceSummary });
  const resultsQuery = useQuery({ queryKey: ["student", "results", "recent"], queryFn: () => getStudentResults(1, 5) });
  const notificationsQuery = useQuery({ queryKey: ["notifications", "dashboard"], queryFn: () => listNotifications(1, 4) });

  if (quizzesQuery.isLoading || performanceQuery.isLoading) return <PageLoader />;

  const quizzes = quizzesQuery.data;
  const performance = performanceQuery.data?.data;
  const availableCount = quizzes?.available.length ?? 0;

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow={user?.studentProfile?.class?.name ?? "Student"}
        name={user?.name ?? ""}
        subtitle={
          availableCount > 0
            ? `You have ${availableCount} quiz${availableCount === 1 ? "" : "zes"} ready to take.`
            : "You're all caught up — check back soon for new quizzes."
        }
        icon={<GraduationCap className="h-10 w-10" />}
        cta={{ label: "Take a quiz", to: "/app/student/quizzes", icon: <ArrowRight className="h-4 w-4" /> }}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Available quizzes" value={quizzes?.available.length ?? 0} icon={<BookOpenCheck className="h-5 w-5" />} accent="brand" />
        <StatCard label="Completed quizzes" value={quizzes?.completed.length ?? 0} icon={<CheckCircle2 className="h-5 w-5" />} accent="accent" />
        <StatCard label="Average score" value={formatPercent(performance?.overallAverage)} icon={<TrendingUp className="h-5 w-5" />} accent="amber" />
        <StatCard label="Unread notifications" value={notificationsQuery.data?.unreadCount ?? 0} icon={<Bell className="h-5 w-5" />} accent="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Subject performance">
            <SubjectBarChart data={performance?.subjectPerformance ?? []} />
          </SectionCard>

          <SectionCard title="Recent results" action={<Link to="/app/student/results" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>}>
            {!resultsQuery.data?.data.length ? (
              <EmptyState title="No results yet" description="Take a quiz to see your results here." />
            ) : (
              <ul className="space-y-2">
                {resultsQuery.data.data.map((r) => {
                  const passed = (r.percentage ?? 0) >= r.quiz.passingScore;
                  return (
                    <ActivityRow
                      key={r.id}
                      to={`/app/student/results/${r.id}`}
                      icon={<CheckCircle2 className="h-4 w-4" />}
                      iconClassName={passed ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}
                      title={r.quiz.title}
                      subtitle={`${r.quiz.subject.name} · ${formatPercent(r.percentage)}`}
                      meta={r.grade && <GradeBadge grade={r.grade} passed={passed} />}
                      timestamp={timeAgo(r.submittedAt)}
                    />
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Upcoming quizzes" action={<Link to="/app/student/quizzes" className="text-sm font-medium text-brand-600 hover:text-brand-700">See all</Link>}>
            {!quizzes?.upcoming.length ? (
              <EmptyState title="Nothing scheduled" description="Upcoming quizzes will show up here." />
            ) : (
              <ul className="space-y-2">
                {quizzes.upcoming.slice(0, 4).map((q) => (
                  <ActivityRow
                    key={q.id}
                    icon={<Clock className="h-4 w-4" />}
                    iconClassName="bg-amber-50 text-amber-600"
                    title={q.title}
                    subtitle={q.subject.name}
                    timestamp={`Opens ${formatDateTime(q.opensAt)}`}
                  />
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Notifications" action={<Link to="/app/student/notifications" className="text-sm font-medium text-brand-600 hover:text-brand-700">View all</Link>}>
            {!notificationsQuery.data?.data.length ? (
              <EmptyState title="You're all caught up" />
            ) : (
              <ul className="space-y-3">
                {notificationsQuery.data.data.map((n) => (
                  <li key={n.id} className="flex items-start gap-2">
                    <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.isRead ? "bg-ink-200" : "bg-brand-500"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-800">{n.title}</p>
                      <p className="truncate text-xs text-ink-500">{n.message}</p>
                      <p className="text-[11px] text-ink-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
