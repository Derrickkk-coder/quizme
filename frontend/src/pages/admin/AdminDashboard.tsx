import { useQuery } from "@tanstack/react-query";
import { GraduationCap, School, BookMarked, Library, BookOpenCheck, TrendingUp } from "lucide-react";
import { getAdminDashboard } from "../../api/admin";
import { StatCard } from "../../components/ui/StatCard";
import { SectionCard } from "../../components/ui/SectionCard";
import { PageLoader } from "../../components/ui/Spinner";
import { SubjectBarChart } from "../../components/charts/SubjectBarChart";
import { MonthlyActivityChart } from "../../components/charts/MonthlyActivityChart";
import { formatPercent } from "../../utils/format";

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: getAdminDashboard });

  if (isLoading) return <PageLoader />;
  if (!data) return null;

  const { totals, subjectPerformance, classPerformance, monthlyActivity } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">School Overview</h1>
        <p className="mt-1 text-sm text-ink-500">A live snapshot of activity across QUIZME.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Students" value={totals.totalStudents} icon={<GraduationCap className="h-4 w-4" />} accent="brand" />
        <StatCard label="Teachers" value={totals.totalTeachers} icon={<School className="h-4 w-4" />} accent="accent" />
        <StatCard label="Classes" value={totals.totalClasses} icon={<BookMarked className="h-4 w-4" />} accent="amber" />
        <StatCard label="Subjects" value={totals.totalSubjects} icon={<Library className="h-4 w-4" />} />
        <StatCard label="Active quizzes" value={totals.activeQuizzes} icon={<BookOpenCheck className="h-4 w-4" />} accent="accent" />
        <StatCard label="Avg. school score" value={formatPercent(totals.averageSchoolScore)} icon={<TrendingUp className="h-4 w-4" />} accent="brand" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total quizzes" value={totals.totalQuizzes} />
        <StatCard label="Closed quizzes" value={totals.closedQuizzes} />
        <StatCard label="Overall pass rate" value={formatPercent(totals.overallPassRate)} accent="accent" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Monthly quiz activity">
          <MonthlyActivityChart data={monthlyActivity} />
        </SectionCard>
        <SectionCard title="Performance by subject">
          <SubjectBarChart data={subjectPerformance} />
        </SectionCard>
      </div>

      <SectionCard title="Performance by class">
        <SubjectBarChart data={classPerformance.map((c) => ({ subject: c.className, averagePercentage: c.averagePercentage }))} />
      </SectionCard>
    </div>
  );
}
