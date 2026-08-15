import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BookOpenCheck, CheckCircle2, TrendingUp, Bell, ArrowRight, Clock } from "lucide-react";
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
import { formatDate, formatDateTime, formatPercent, timeAgo } from "../../utils/format";

export default function StudentDashboard() {
  const { user } = useAuth();

  const quizzesQuery = useQuery({ queryKey: ["student", "quizzes"], queryFn: getStudentQuizzes });
  const performanceQuery = useQuery({ queryKey: ["student", "performance", "summary"], queryFn: getStudentPerformanceSummary });
  const resultsQuery = useQuery({ queryKey: ["student", "results", "recent"], queryFn: () => getStudentResults(1, 5) });
  const notificationsQuery = useQuery({ queryKey: ["notifications", "dashboard"], queryFn: () => listNotifications(1, 4) });

  if (quizzesQuery.isLoading || performanceQuery.isLoading) return <PageLoader />;

  const quizzes = quizzesQuery.data;
  const performance = performanceQuery.data?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Welcome back, {user?.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-sm text-ink-500">
          {user?.studentProfile?.class?.name ? `${user.studentProfile.class.name} · ` : ""}
          Here's what's happening with your quizzes today.
        </p>
      </div>

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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                      <th className="pb-2">Quiz</th>
                      <th className="pb-2">Subject</th>
                      <th className="pb-2">Score</th>
                      <th className="pb-2">Grade</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultsQuery.data.data.map((r) => (
                      <tr key={r.id} className="border-b border-ink-50 last:border-0">
                        <td className="py-2.5 font-medium text-ink-800">
                          <Link to={`/app/student/results/${r.id}`} className="hover:text-brand-600">
                            {r.quiz.title}
                          </Link>
                        </td>
                        <td className="py-2.5 text-ink-500">{r.quiz.subject.name}</td>
                        <td className="py-2.5 text-ink-600">{formatPercent(r.percentage)}</td>
                        <td className="py-2.5">{r.grade && <GradeBadge grade={r.grade} passed={(r.percentage ?? 0) >= r.quiz.passingScore} />}</td>
                        <td className="py-2.5 text-ink-400">{formatDate(r.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Upcoming quizzes" action={<Link to="/app/student/quizzes" className="text-sm font-medium text-brand-600 hover:text-brand-700">See all</Link>}>
            {!quizzes?.upcoming.length ? (
              <EmptyState title="Nothing scheduled" description="Upcoming quizzes will show up here." />
            ) : (
              <ul className="space-y-3">
                {quizzes.upcoming.slice(0, 4).map((q) => (
                  <li key={q.id} className="flex items-start gap-3 rounded-xl border border-ink-100 p-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink-800">{q.title}</p>
                      <p className="text-xs text-ink-400">Opens {formatDateTime(q.opensAt)}</p>
                    </div>
                  </li>
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

          {!!quizzes?.available.length && (
            <Link
              to="/app/student/quizzes"
              className="flex items-center justify-between rounded-2xl bg-brand-600 p-5 text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              <div>
                <p className="font-semibold">{quizzes.available.length} quiz{quizzes.available.length > 1 ? "zes" : ""} ready</p>
                <p className="text-sm text-brand-100">Jump back in and take a quiz now.</p>
              </div>
              <ArrowRight className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
