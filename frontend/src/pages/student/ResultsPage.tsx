import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getStudentResults } from "../../api/student";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { GradeBadge, AttemptStatusBadge } from "../../components/ui/StatusBadge";
import { Pagination } from "../../components/ui/Pagination";
import { formatDateTime, formatPercent } from "../../utils/format";

export default function ResultsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: ["student", "results", page], queryFn: () => getStudentResults(page, 10) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">My Results</h1>
        <p className="mt-1 text-sm text-ink-500">All of your submitted quiz attempts.</p>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !data?.data.length ? (
        <EmptyState title="No results yet" description="Complete a quiz to see your results here." />
      ) : (
        <div className="card overflow-hidden">
          {/* Card list on small screens — a 6-column table doesn't fit a phone. */}
          <div className="divide-y divide-ink-100 sm:hidden">
            {data.data.map((r) => (
              <Link key={r.id} to={`/app/student/results/${r.id}`} className="block px-4 py-3 hover:bg-ink-50/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-800">{r.quiz.title}</p>
                    <p className="text-xs text-ink-500">{r.quiz.subject.name}</p>
                  </div>
                  {r.grade && <GradeBadge grade={r.grade} passed={(r.percentage ?? 0) >= r.quiz.passingScore} />}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-700">
                    {r.score}/{r.totalMarks} ({formatPercent(r.percentage)})
                  </span>
                  <AttemptStatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-xs text-ink-400">{formatDateTime(r.submittedAt)}</p>
              </Link>
            ))}
          </div>

          {/* Table on larger screens */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="bg-ink-50">
                <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3">Quiz</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((r) => (
                  <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <Link to={`/app/student/results/${r.id}`} className="font-medium text-ink-800 hover:text-brand-600">
                        {r.quiz.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-500">{r.quiz.subject.name}</td>
                    <td className="px-4 py-3 font-medium text-ink-700">
                      {r.score}/{r.totalMarks} ({formatPercent(r.percentage)})
                    </td>
                    <td className="px-4 py-3">{r.grade && <GradeBadge grade={r.grade} passed={(r.percentage ?? 0) >= r.quiz.passingScore} />}</td>
                    <td className="px-4 py-3">
                      <AttemptStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-400">{formatDateTime(r.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
