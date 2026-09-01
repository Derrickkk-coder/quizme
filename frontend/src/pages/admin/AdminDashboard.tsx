import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BookMarked,
  BookOpenCheck,
  GraduationCap,
  Library,
  School,
  ShieldCheck,
  TrendingUp,
  User,
} from "lucide-react";
import { getAdminDashboard, listAuditLogs } from "../../api/admin";
import { useAuth } from "../../context/AuthContext";
import { StatCard } from "../../components/ui/StatCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { SubjectBarChart } from "../../components/charts/SubjectBarChart";
import { MonthlyActivityChart } from "../../components/charts/MonthlyActivityChart";
import { DashboardHero } from "../../components/dashboard/DashboardHero";
import { ActivityRow } from "../../components/dashboard/ActivityRow";
import { formatPercent, timeAgo } from "../../utils/format";

const entityIcon: Record<string, { icon: typeof Activity; className: string }> = {
  User: { icon: User, className: "bg-brand-50 text-brand-600" },
  Quiz: { icon: BookOpenCheck, className: "bg-accent-50 text-accent-600" },
  QuizAttempt: { icon: BookOpenCheck, className: "bg-accent-50 text-accent-600" },
  Question: { icon: Library, className: "bg-amber-50 text-amber-600" },
  Subject: { icon: Library, className: "bg-amber-50 text-amber-600" },
  Class: { icon: BookMarked, className: "bg-red-50 text-red-600" },
  TeacherClassSubject: { icon: School, className: "bg-brand-50 text-brand-600" },
};

function humanizeAction(action: string): string {
  const lower = action.replace(/_/g, " ").toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: getAdminDashboard });
  const activityQuery = useQuery({ queryKey: ["admin", "audit-logs", "recent"], queryFn: () => listAuditLogs({ page: 1, pageSize: 6 }) });

  if (isLoading) return <PageLoader />;
  if (!data) return null;

  const { totals, subjectPerformance, classPerformance, monthlyActivity } = data;

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="Admin"
        name={user?.name ?? ""}
        subtitle="A live snapshot of activity across EduQuiz."
        icon={<ShieldCheck className="h-10 w-10" />}
        cta={{ label: "View Reports", to: "/app/admin/reports", icon: <TrendingUp className="h-4 w-4" /> }}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <StatCard label="Students" value={totals.totalStudents} icon={<GraduationCap className="h-4 w-4" />} accent="brand" />
        <StatCard label="Teachers" value={totals.totalTeachers} icon={<School className="h-4 w-4" />} accent="accent" />
        <StatCard label="Classes" value={totals.totalClasses} icon={<BookMarked className="h-4 w-4" />} accent="amber" />
        <StatCard label="Subjects" value={totals.totalSubjects} icon={<Library className="h-4 w-4" />} />
        <StatCard label="Active quizzes" value={totals.activeQuizzes} icon={<BookOpenCheck className="h-4 w-4" />} accent="accent" />
        <StatCard label="Avg. school score" value={formatPercent(totals.averageSchoolScore)} icon={<TrendingUp className="h-4 w-4" />} accent="brand" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <StatCard label="Total quizzes" value={totals.totalQuizzes} />
        <StatCard label="Closed quizzes" value={totals.closedQuizzes} />
        <StatCard label="Overall pass rate" value={formatPercent(totals.overallPassRate)} accent="accent" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title="Monthly quiz activity" className="lg:col-span-2">
          <MonthlyActivityChart data={monthlyActivity} />
        </SectionCard>

        <SectionCard title="Recent activity">
          {!activityQuery.data?.data.length ? (
            <EmptyState title="No activity yet" />
          ) : (
            <ul className="space-y-2">
              {activityQuery.data.data.map((entry) => {
                const meta = entityIcon[entry.entityType ?? ""] ?? { icon: Activity, className: "bg-ink-100 text-ink-500" };
                const Icon = meta.icon;
                return (
                  <ActivityRow
                    key={entry.id}
                    icon={<Icon className="h-4 w-4" />}
                    iconClassName={meta.className}
                    title={humanizeAction(entry.action)}
                    subtitle={entry.actor?.name ?? "System"}
                    timestamp={timeAgo(entry.createdAt)}
                  />
                );
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Performance by subject">
          <SubjectBarChart data={subjectPerformance} />
        </SectionCard>
        <SectionCard title="Performance by class">
          <SubjectBarChart data={classPerformance.map((c) => ({ subject: c.className, averagePercentage: c.averagePercentage }))} />
        </SectionCard>
      </div>
    </div>
  );
}
