import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Send, X } from "lucide-react";
import { getTeacherResult, sendResultFeedback } from "../../api/teacher";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { PageLoader } from "../../components/ui/Spinner";
import { StatCard } from "../../components/ui/StatCard";
import { GradeBadge } from "../../components/ui/StatusBadge";
import { formatDateTime, formatPercent } from "../../utils/format";

export default function ResultDetailPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["teacher", "result", attemptId],
    queryFn: () => getTeacherResult(attemptId!),
    enabled: !!attemptId,
  });

  const feedbackMutation = useMutation({
    mutationFn: () => sendResultFeedback(attemptId!, feedback),
    onSuccess: () => {
      showToast("Feedback sent to student", "success");
      setFeedback("");
      queryClient.invalidateQueries({ queryKey: ["teacher", "result", attemptId] });
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  if (isLoading) return <PageLoader />;
  const result = data?.data;
  if (!result) return null;

  return (
    <div className="space-y-6">
      <Link to="/app/teacher/results" className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to results
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-ink-900">{result.quiz.title}</h1>
        <p className="mt-1 text-sm text-ink-500">
          {result.student?.user.name} · Submitted {formatDateTime(result.submittedAt)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
        <StatCard label="Score" value={`${result.score}/${result.totalMarks}`} />
        <StatCard label="Percentage" value={formatPercent(result.percentage)} />
        <StatCard label="Grade" value={result.grade ? <GradeBadge grade={result.grade} passed={(result.percentage ?? 0) >= result.quiz.passingScore} /> : "—"} />
        <StatCard label="Attempt #" value={result.attemptNumber} />
      </div>

      <div className="card space-y-4 p-6">
        <h2 className="text-base font-semibold text-ink-900">Send feedback</h2>
        {result.teacherFeedback && (
          <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">Current feedback</p>
            {result.teacherFeedback}
          </div>
        )}
        <textarea className="textarea" placeholder="Write feedback for this student…" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <button className="btn-primary" disabled={!feedback.trim() || feedbackMutation.isPending} onClick={() => feedbackMutation.mutate()}>
          <Send className="h-4 w-4" /> Send Feedback
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-ink-900">Answers</h2>
        {result.answers.map((a: any, i: number) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-ink-900">
                {i + 1}. {a.question.text}
              </p>
              <span className={`shrink-0 rounded-full p-1 ${a.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {a.isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {a.question.options.map((opt: any) => {
                const isSelected = opt.id === a.selectedOptionId;
                return (
                  <div
                    key={opt.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      opt.isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-800" : isSelected ? "border-red-300 bg-red-50 text-red-800" : "border-ink-100 text-ink-600"
                    }`}
                  >
                    {opt.text}
                    {isSelected && <span className="ml-2 text-xs font-semibold">(Student's answer)</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
