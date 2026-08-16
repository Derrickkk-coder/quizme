import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, MessageSquare, X, EyeOff } from "lucide-react";
import { getAttempt } from "../../api/student";
import { PageLoader } from "../../components/ui/Spinner";
import { GradeBadge } from "../../components/ui/StatusBadge";
import { StatCard } from "../../components/ui/StatCard";
import { formatDateTime, formatPercent } from "../../utils/format";
import { AttemptResult } from "../../types";

export default function ResultDetailPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["student", "attempt", attemptId],
    queryFn: () => getAttempt(attemptId!),
    enabled: !!attemptId,
  });

  if (isLoading) return <PageLoader />;
  if (!data) return null;

  const result = data.data as AttemptResult;

  return (
    <div className="space-y-6">
      <Link to="/app/student/results" className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> Back to results
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-ink-900">{result.quizTitle}</h1>
        <p className="mt-1 text-sm text-ink-500">
          {result.subject} · Submitted {formatDateTime(result.submittedAt)}
        </p>
      </div>

      {result.resultsWithheld ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <EyeOff className="h-8 w-8 text-ink-400" />
          <p className="font-semibold text-ink-800">Results not yet released</p>
          <p className="max-w-sm text-sm text-ink-500">Your teacher hasn't made the results for this quiz available yet. Check back later.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
            <StatCard label="Score" value={`${result.score}/${result.totalMarks}`} />
            <StatCard label="Percentage" value={formatPercent(result.percentage)} />
            <StatCard label="Grade" value={result.grade ? <GradeBadge grade={result.grade} passed={result.passed} /> : "—"} />
            <StatCard label="Result" value={result.passed ? "Passed" : "Not passed"} accent={result.passed ? "accent" : "red"} />
          </div>

          {result.teacherFeedback && (
            <div className="card flex gap-3 p-5">
              <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              <div>
                <p className="text-sm font-semibold text-ink-900">Feedback from your teacher</p>
                <p className="mt-1 text-sm text-ink-600">{result.teacherFeedback}</p>
              </div>
            </div>
          )}

          {result.questions && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-ink-900">Question review</h2>
              {result.questions.map((q) => (
                <div key={q.questionNumber} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-ink-900">
                      {q.questionNumber}. {q.text}
                    </p>
                    <span className={`shrink-0 rounded-full p-1 ${q.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {q.isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    {q.options.map((opt) => {
                      const isSelected = q.selectedOptionIds.includes(opt.id);
                      const isCorrectOption = opt.isCorrect;
                      return (
                        <div
                          key={opt.id}
                          className={`rounded-lg border px-3 py-2 text-sm ${
                            isCorrectOption
                              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                              : isSelected
                                ? "border-red-300 bg-red-50 text-red-800"
                                : "border-ink-100 text-ink-600"
                          }`}
                        >
                          {opt.text}
                          {isSelected && <span className="ml-2 text-xs font-semibold">(Your answer)</span>}
                          {isCorrectOption && <span className="ml-2 text-xs font-semibold">(Correct answer)</span>}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">{q.explanation}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
