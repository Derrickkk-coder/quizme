import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard } from "../../api/admin";
import { PageLoader } from "../../components/ui/Spinner";
import { SectionCard } from "../../components/ui/SectionCard";
import { StatCard } from "../../components/ui/StatCard";
import { SubjectBarChart } from "../../components/charts/SubjectBarChart";
import { SimplePieChart } from "../../components/charts/SimplePieChart";
import { MonthlyActivityChart } from "../../components/charts/MonthlyActivityChart";
import { formatPercent } from "../../utils/format";

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "dashboard"], queryFn: getAdminDashboard });

  if (isLoading) return <PageLoader />;
  if (!data) return null;

  const { totals, subjectPerformance, classPerformance, monthlyActivity } = data;
  const passCount = Math.round((totals.overallPassRate / 100) * totals.totalAttempts);
  const failCount = totals.totalAttempts - passCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">School Analytics</h1>
        <p className="mt-1 text-sm text-ink-500">Deeper insight into performance across the school.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <StatCard label="Total attempts" value={totals.totalAttempts} />
        <StatCard label="Average score" value={formatPercent(totals.averageSchoolScore)} accent="brand" />
        <StatCard label="Pass rate" value={formatPercent(totals.overallPassRate)} accent="accent" />
        <StatCard label="Active quizzes" value={totals.activeQuizzes} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="Pass / Fail across the school">
          <SimplePieChart
            data={[
              { name: "Pass", value: passCount, color: "#16a34a" },
              { name: "Fail", value: failCount, color: "#dc2626" },
            ]}
          />
        </SectionCard>
        <SectionCard title="Monthly quiz activity">
          <MonthlyActivityChart data={monthlyActivity} />
        </SectionCard>
      </div>

      <SectionCard title="Average score by subject">
        <SubjectBarChart data={subjectPerformance} />
      </SectionCard>

      <SectionCard title="Average score by class">
        <SubjectBarChart data={classPerformance.map((c) => ({ subject: c.className, averagePercentage: c.averagePercentage }))} />
      </SectionCard>
    </div>
  );
}
