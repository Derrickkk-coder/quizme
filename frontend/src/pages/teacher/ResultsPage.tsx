import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { downloadTeacherResultsCsv, getTeacherClasses, listTeacherQuizzes, listTeacherResults } from "../../api/teacher";
import { useToast } from "../../context/ToastContext";
import { apiErrorMessage } from "../../api/client";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { GradeBadge } from "../../components/ui/StatusBadge";
import { Pagination } from "../../components/ui/Pagination";
import { formatDateTime, formatPercent } from "../../utils/format";

export default function ResultsPage() {
  const [page, setPage] = useState(1);
  const [quizId, setQuizId] = useState("");
  const [classId, setClassId] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const { showToast } = useToast();

  const classesQuery = useQuery({ queryKey: ["teacher", "classes"], queryFn: getTeacherClasses });
  const quizzesQuery = useQuery({ queryKey: ["teacher", "quizzes", "all"], queryFn: () => listTeacherQuizzes({ pageSize: 100 }) });

  const resultsQuery = useQuery({
    queryKey: ["teacher", "results", { page, quizId, classId, pendingOnly }],
    queryFn: () =>
      listTeacherResults({ page, pageSize: 10, quizId: quizId || undefined, classId: classId || undefined, pendingReview: pendingOnly || undefined }),
  });

  async function handleExport() {
    try {
      await downloadTeacherResultsCsv({ quizId: quizId || undefined, classId: classId || undefined });
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Results</h1>
          <p className="mt-1 text-sm text-ink-500">Submissions and grades across your quizzes.</p>
        </div>
        <button className="btn-secondary" onClick={handleExport}>
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <select className="select w-auto" value={quizId} onChange={(e) => { setQuizId(e.target.value); setPage(1); }}>
          <option value="">All quizzes</option>
          {quizzesQuery.data?.data.map((q) => (
            <option key={q.id} value={q.id}>{q.title}</option>
          ))}
        </select>
        <select className="select w-auto" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
          <option value="">All classes</option>
          {classesQuery.data?.data.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded text-brand-600"
            checked={pendingOnly}
            onChange={(e) => { setPendingOnly(e.target.checked); setPage(1); }}
          />
          Needs review
        </label>
      </div>

      {resultsQuery.isLoading ? (
        <PageLoader />
      ) : !resultsQuery.data?.data.length ? (
        <EmptyState title="No submissions found" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50">
                <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Quiz</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {resultsQuery.data.data.map((r) => (
                  <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <Link to={`/app/teacher/results/${r.id}`} className="flex items-center gap-2 font-medium text-ink-800 hover:text-brand-600">
                        {r.student?.user.name}
                        {r.hasPendingReview && <span className="badge bg-amber-100 text-amber-700">Needs review</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{r.quiz.title}</td>
                    <td className="px-4 py-3 text-ink-500">{r.student?.class?.name}</td>
                    <td className="px-4 py-3 font-medium text-ink-700">
                      {r.score}/{r.totalMarks} ({formatPercent(r.percentage)})
                    </td>
                    <td className="px-4 py-3">{r.grade && <GradeBadge grade={r.grade} passed={(r.percentage ?? 0) >= r.quiz.passingScore} />}</td>
                    <td className="px-4 py-3 text-ink-400">{formatDateTime(r.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={resultsQuery.data.meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
