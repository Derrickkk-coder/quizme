import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Send, Sparkles, X } from "lucide-react";
import { getTeacherResult, gradeShortAnswer, sendResultFeedback } from "../../api/teacher";
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
        {result.answers.map((a: any, i: number) =>
          a.question.type === "SHORT_ANSWER" ? (
            <ShortAnswerGraderCard key={a.id} attemptId={result.id} answer={a} index={i} />
          ) : (
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
                  const isSelected = (a.selectedOptionIds as string[]).includes(opt.id);
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
          )
        )}
      </div>
    </div>
  );
}

function ShortAnswerGraderCard({ attemptId, answer, index }: { attemptId: string; answer: any; index: number }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const maxMarks = answer.question.marks;
  const [marks, setMarks] = useState<number>(answer.marksAwarded ?? answer.aiSuggestedMarks ?? 0);
  const [note, setNote] = useState(answer.teacherNote ?? "");
  const hasAnswer = !!answer.textAnswer?.trim();

  const gradeMutation = useMutation({
    mutationFn: () => gradeShortAnswer(attemptId, answer.id, { marksAwarded: marks, teacherNote: note || undefined }),
    onSuccess: () => {
      showToast("Grade saved", "success");
      queryClient.invalidateQueries({ queryKey: ["teacher", "result", attemptId] });
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink-900">
          {index + 1}. {answer.question.text}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {answer.needsReview && <span className="badge bg-amber-100 text-amber-700">Needs review</span>}
          <span className="rounded-full bg-ink-100 px-2 py-1 text-xs font-semibold text-ink-600">
            {answer.marksAwarded ?? 0}/{maxMarks}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-sm text-ink-700">
        {hasAnswer ? answer.textAnswer : <span className="italic text-ink-400">No answer given</span>}
      </div>

      {answer.question.modelAnswer && (
        <p className="mt-2 text-xs text-ink-400">
          <span className="font-semibold text-ink-500">Model answer:</span> {answer.question.modelAnswer}
        </p>
      )}

      {hasAnswer && answer.aiSuggestedFeedback && (
        <div className="mt-3 flex gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            <span className="font-semibold">AI suggested {answer.aiSuggestedMarks}/{maxMarks}</span> — {answer.aiSuggestedFeedback}
          </p>
        </div>
      )}

      {hasAnswer && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Marks</label>
            <input
              type="number"
              min={0}
              max={maxMarks}
              className="input w-24"
              value={marks}
              onChange={(e) => setMarks(Math.max(0, Math.min(maxMarks, Number(e.target.value))))}
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="label">Note to student (optional)</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Shown to the student instead of the AI's feedback" />
          </div>
          <button className="btn-primary" onClick={() => gradeMutation.mutate()} disabled={gradeMutation.isPending}>
            {gradeMutation.isPending ? "Saving…" : answer.needsReview ? "Confirm grade" : "Update grade"}
          </button>
        </div>
      )}
    </div>
  );
}
