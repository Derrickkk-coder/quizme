import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Pencil, PlusCircle, Search, Send, Trash2, XCircle, BarChart3 } from "lucide-react";
import {
  closeQuiz,
  deleteQuiz,
  duplicateQuiz,
  getTeacherClasses,
  getTeacherSubjects,
  listTeacherQuizzes,
  publishQuiz,
} from "../../api/teacher";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { QuizStatusBadge } from "../../components/ui/StatusBadge";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { formatDateTime, formatDuration } from "../../utils/format";
import { QuizStatus } from "../../types";

export default function QuizzesPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<QuizStatus | "">("");
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const subjectsQuery = useQuery({ queryKey: ["teacher", "subjects"], queryFn: getTeacherSubjects });
  const classesQuery = useQuery({ queryKey: ["teacher", "classes"], queryFn: getTeacherClasses });

  const quizzesQuery = useQuery({
    queryKey: ["teacher", "quizzes", { page, status, subjectId, classId, search }],
    queryFn: () =>
      listTeacherQuizzes({
        page,
        pageSize: 10,
        status: status || undefined,
        subjectId: subjectId || undefined,
        classId: classId || undefined,
        search: search || undefined,
      }),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["teacher", "quizzes"] });
  }

  const publishMutation = useMutation({
    mutationFn: publishQuiz,
    onSuccess: () => {
      showToast("Quiz published", "success");
      invalidate();
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });
  const closeMutation = useMutation({
    mutationFn: closeQuiz,
    onSuccess: () => {
      showToast("Quiz closed", "success");
      invalidate();
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });
  const duplicateMutation = useMutation({
    mutationFn: duplicateQuiz,
    onSuccess: (res) => {
      showToast("Quiz duplicated", "success");
      invalidate();
      navigate(`/app/teacher/quizzes/${res.data.id}/edit`);
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteQuiz,
    onSuccess: () => {
      showToast("Quiz deleted", "success");
      setDeleteTarget(null);
      invalidate();
    },
    onError: (err) => {
      showToast(apiErrorMessage(err), "error");
      setDeleteTarget(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Quizzes</h1>
          <p className="mt-1 text-sm text-ink-500">Create, publish, and manage your quizzes.</p>
        </div>
        <Link to="/app/teacher/quizzes/new" className="btn-primary">
          <PlusCircle className="h-4 w-4" /> Create Quiz
        </Link>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search quizzes…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="select w-auto" value={status} onChange={(e) => { setStatus(e.target.value as QuizStatus | ""); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="ACTIVE">Active</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select className="select w-auto" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setPage(1); }}>
          <option value="">All subjects</option>
          {subjectsQuery.data?.data.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select className="select w-auto" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
          <option value="">All classes</option>
          {classesQuery.data?.data.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {quizzesQuery.isLoading ? (
        <PageLoader />
      ) : !quizzesQuery.data?.data.length ? (
        <EmptyState title="No quizzes found" description="Create your first quiz to get started." action={<Link to="/app/teacher/quizzes/new" className="btn-primary">Create Quiz</Link>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50">
                <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3">Quiz</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submissions</th>
                  <th className="px-4 py-3">Closes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzesQuery.data.data.map((q) => (
                  <tr key={q.id} className="border-t border-ink-100 hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-800">{q.title}</p>
                      <p className="text-xs text-ink-400">{q.subject.name}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{q.class.name}</td>
                    <td className="px-4 py-3 text-ink-600">{formatDuration(q.durationMinutes)}</td>
                    <td className="px-4 py-3"><QuizStatusBadge status={q.status} /></td>
                    <td className="px-4 py-3 text-ink-600">{q._count?.attempts ?? 0}</td>
                    <td className="px-4 py-3 text-ink-400">{formatDateTime(q.closesAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/app/teacher/quizzes/${q.id}/edit`} className="btn-ghost btn-sm" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Link>
                        {q.status === "DRAFT" && (
                          <button className="btn-ghost btn-sm" title="Publish" onClick={() => publishMutation.mutate(q.id)}>
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        {(q.status === "ACTIVE" || q.status === "SCHEDULED") && (
                          <button className="btn-ghost btn-sm" title="Close" onClick={() => closeMutation.mutate(q.id)}>
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        {q.status !== "DRAFT" && (
                          <Link to={`/app/teacher/analytics?quizId=${q.id}`} className="btn-ghost btn-sm" title="Analytics">
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                        )}
                        <button className="btn-ghost btn-sm" title="Duplicate" onClick={() => duplicateMutation.mutate(q.id)}>
                          <Copy className="h-4 w-4" />
                        </button>
                        <button className="btn-ghost btn-sm text-red-600" title="Delete" onClick={() => setDeleteTarget(q.id)}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={quizzesQuery.data.meta} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete quiz?"
        message="This will permanently delete the quiz. This can't be undone."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
