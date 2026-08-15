import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getStudentResults } from "../../api/student";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { GradeBadge } from "../../components/ui/StatusBadge";
import { formatDateTime, formatPercent } from "../../utils/format";
import { QuizAttemptSummary } from "../../types";

function groupByMonth(results: QuizAttemptSummary[]): [string, QuizAttemptSummary[]][] {
  const groups = new Map<string, QuizAttemptSummary[]>();
  for (const r of results) {
    if (!r.submittedAt) continue;
    const key = new Date(r.submittedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }
  return Array.from(groups.entries());
}

export default function HistoryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["student", "history"], queryFn: () => getStudentResults(1, 100) });

  if (isLoading) return <PageLoader />;
  const groups = groupByMonth(data?.data ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Quiz History</h1>
        <p className="mt-1 text-sm text-ink-500">A timeline of every quiz you've completed.</p>
      </div>

      {!groups.length ? (
        <EmptyState title="No history yet" description="Your completed quizzes will appear here in a timeline." />
      ) : (
        <div className="space-y-8">
          {groups.map(([month, items]) => (
            <div key={month}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-400">{month}</h2>
              <div className="relative space-y-3 border-l-2 border-ink-100 pl-6">
                {items.map((r) => (
                  <Link
                    key={r.id}
                    to={`/app/student/results/${r.id}`}
                    className="card relative block p-4 transition-shadow hover:shadow-md"
                  >
                    <span className="absolute -left-[29px] top-5 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-ink-800">{r.quiz.title}</p>
                        <p className="text-xs text-ink-400">
                          {r.quiz.subject.name} · {formatDateTime(r.submittedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-ink-700">{formatPercent(r.percentage)}</span>
                        {r.grade && <GradeBadge grade={r.grade} passed={(r.percentage ?? 0) >= r.quiz.passingScore} />}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
