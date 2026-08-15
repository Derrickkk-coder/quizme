import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAdminQuizzes } from "../../api/admin";
import { listClasses, listSubjects } from "../../api/admin";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { QuizStatusBadge } from "../../components/ui/StatusBadge";
import { formatDateTime, formatDuration } from "../../utils/format";
import { QuizStatus } from "../../types";

export default function QuizzesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<QuizStatus | "">("");
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");

  const subjectsQuery = useQuery({ queryKey: ["admin", "subjects"], queryFn: listSubjects });
  const classesQuery = useQuery({ queryKey: ["admin", "classes"], queryFn: listClasses });

  const quizzesQuery = useQuery({
    queryKey: ["admin", "quizzes", { page, status, subjectId, classId, search }],
    queryFn: () =>
      listAdminQuizzes({ page, pageSize: 12, status: status || undefined, subjectId: subjectId || undefined, classId: classId || undefined, search: search || undefined }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">All Quizzes</h1>
        <p className="mt-1 text-sm text-ink-500">A school-wide view of every quiz across all teachers.</p>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <input className="input min-w-[200px] flex-1" placeholder="Search quizzes…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="select w-auto" value={status} onChange={(e) => { setStatus(e.target.value as QuizStatus | ""); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="ACTIVE">Active</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select className="select w-auto" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setPage(1); }}>
          <option value="">All subjects</option>
          {subjectsQuery.data?.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="select w-auto" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
          <option value="">All classes</option>
          {classesQuery.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {quizzesQuery.isLoading ? (
        <PageLoader />
      ) : !quizzesQuery.data?.data.length ? (
        <EmptyState title="No quizzes found" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50">
                <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3">Quiz</th>
                  <th className="px-4 py-3">Teacher</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submissions</th>
                  <th className="px-4 py-3">Closes</th>
                </tr>
              </thead>
              <tbody>
                {quizzesQuery.data.data.map((q) => (
                  <tr key={q.id} className="border-t border-ink-100 hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-800">{q.title}</p>
                      <p className="text-xs text-ink-400">{q.subject.name}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{q.teacher?.user?.name}</td>
                    <td className="px-4 py-3 text-ink-600">{q.class.name}</td>
                    <td className="px-4 py-3 text-ink-600">{formatDuration(q.durationMinutes)}</td>
                    <td className="px-4 py-3"><QuizStatusBadge status={q.status} /></td>
                    <td className="px-4 py-3 text-ink-600">{q._count?.attempts ?? 0}</td>
                    <td className="px-4 py-3 text-ink-400">{formatDateTime(q.closesAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={quizzesQuery.data.meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
