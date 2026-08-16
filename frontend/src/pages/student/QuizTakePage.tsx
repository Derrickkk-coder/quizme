import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Maximize, ShieldAlert } from "lucide-react";
import { getActiveAttempt, recordTabSwitch, saveAnswer, startAttempt, submitAttempt } from "../../api/student";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { AttemptInProgress } from "../../types";
import { PageLoader } from "../../components/ui/Spinner";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { formatSeconds } from "../../utils/format";
import { Logo } from "../../components/Logo";

export default function QuizTakePage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [attempt, setAttempt] = useState<AttemptInProgress | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const startedRef = useRef(false);
  const submittedRef = useRef(false);
  const tabSwitchRef = useRef(0);

  const loadAttempt = useCallback(async () => {
    if (!quizId) return;
    try {
      // Resume an already in-progress attempt for this quiz if one exists,
      // otherwise start a new one.
      const active = await getActiveAttempt();
      const result =
        active.data && active.data.quizId === quizId && active.data.status === "IN_PROGRESS"
          ? active.data
          : (await startAttempt(quizId)).data;

      if (result.status !== "IN_PROGRESS") {
        navigate(`/app/student/results/${result.id}`, { replace: true });
        return;
      }

      setAttempt(result);
      setRemainingSeconds(result.remainingSeconds);
      setTabSwitchCount(0);
      tabSwitchRef.current = 0;
    } catch (err) {
      setLoadError(apiErrorMessage(err));
    }
  }, [quizId, navigate]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    loadAttempt();
  }, [loadAttempt]);

  const handleSubmit = useCallback(
    async (auto: boolean) => {
      if (!attempt || submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        const res = await submitAttempt(attempt.id, tabSwitchRef.current);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        showToast(auto ? "Time's up — your quiz was submitted automatically." : "Quiz submitted successfully.", "success");
        navigate(`/app/student/results/${res.data.id}`, { replace: true });
      } catch (err) {
        showToast(apiErrorMessage(err), "error");
        submittedRef.current = false;
        setSubmitting(false);
      }
    },
    [attempt, navigate, showToast]
  );

  // Countdown timer
  useEffect(() => {
    if (!attempt) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt, handleSubmit]);

  // Warn before leaving the page while a quiz is in progress.
  useEffect(() => {
    if (!attempt) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [attempt]);

  // Detect tab/window switching.
  useEffect(() => {
    if (!attempt) return;
    function handleVisibilityChange() {
      if (document.hidden && !submittedRef.current) {
        tabSwitchRef.current += 1;
        setTabSwitchCount(tabSwitchRef.current);
        recordTabSwitch(attempt!.id).catch(() => {});
        showToast("You switched away from the quiz. This has been recorded.", "error");
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [attempt, showToast]);

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function handleEnterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Fullscreen may be unavailable in some browsers/environments — not fatal.
    }
  }

  async function handleSelectOption(questionId: string, optionId: string) {
    if (!attempt) return;
    const target = attempt.questions.find((q) => q.questionId === questionId);
    if (!target) return;

    const nextSelected =
      target.type === "MULTIPLE_SELECT"
        ? target.selectedOptionIds.includes(optionId)
          ? target.selectedOptionIds.filter((id) => id !== optionId)
          : [...target.selectedOptionIds, optionId]
        : [optionId];

    setAttempt((prev) => {
      if (!prev) return prev;
      const questions = prev.questions.map((q) => (q.questionId === questionId ? { ...q, selectedOptionIds: nextSelected } : q));
      return { ...prev, questions, answeredCount: questions.filter((q) => q.selectedOptionIds.length > 0).length };
    });
    try {
      await saveAnswer(attempt.id, questionId, nextSelected);
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <div className="card max-w-md p-8 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-red-500" />
          <p className="mt-4 font-semibold text-ink-900">Unable to start this quiz</p>
          <p className="mt-1 text-sm text-ink-500">{loadError}</p>
          <button className="btn-primary mt-6" onClick={() => navigate("/app/student/quizzes")}>
            Back to My Quizzes
          </button>
        </div>
      </div>
    );
  }

  if (!attempt) return <PageLoader />;

  const question = attempt.questions[currentIndex];
  const totalQuestions = attempt.questions.length;
  const answeredCount = attempt.questions.filter((q) => q.selectedOptionIds.length > 0).length;
  const isLast = currentIndex === totalQuestions - 1;
  const isLow = remainingSeconds <= 60;

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo markClassName="h-7 w-7" />
            <div>
              <p className="text-sm font-semibold text-ink-900">{attempt.quizTitle}</p>
              <p className="text-xs text-ink-400">{attempt.subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isFullscreen && (
              <button onClick={handleEnterFullscreen} className="btn-secondary btn-sm">
                <Maximize className="h-3.5 w-3.5" /> Fullscreen
              </button>
            )}
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold tabular-nums ${isLow ? "animate-pulse bg-red-50 text-red-600" : "bg-brand-50 text-brand-700"}`}>
              {formatSeconds(remainingSeconds)}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-ink-500">
            <span>
              Question {currentIndex + 1} of {totalQuestions}
            </span>
            <span>
              {answeredCount} of {totalQuestions} answered
            </span>
          </div>
          <div className="mt-1.5">
            <ProgressBar value={answeredCount} max={totalQuestions} />
          </div>
        </div>
      </header>

      {tabSwitchCount > 0 && (
        <div className="mx-auto mt-3 flex max-w-5xl items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          You've switched away from this quiz {tabSwitchCount} time{tabSwitchCount > 1 ? "s" : ""}. Please stay on this page until you submit.
        </div>
      )}

      <main className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_240px]">
        <div className="card p-6">
          {attempt.instructions && currentIndex === 0 && (
            <div className="mb-5 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">{attempt.instructions}</div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
              Question {currentIndex + 1} of {totalQuestions} · {question.marks} mark{question.marks > 1 ? "s" : ""}
            </p>
            {question.type === "MULTIPLE_SELECT" && (
              <span className="badge shrink-0 bg-accent-100 text-accent-700">Select all that apply</span>
            )}
          </div>
          <h2 className="mt-2 text-lg font-semibold leading-relaxed text-ink-900">{question.text}</h2>

          <div className="mt-5 space-y-3">
            {question.options.map((option, i) => {
              const selected = question.selectedOptionIds.includes(option.id);
              const isMulti = question.type === "MULTIPLE_SELECT";
              return (
                <button
                  key={option.id}
                  onClick={() => handleSelectOption(question.questionId, option.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    selected ? "border-brand-500 bg-brand-50 text-brand-900" : "border-ink-200 hover:border-brand-300 hover:bg-ink-50"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center border text-xs font-bold ${isMulti ? "rounded-md" : "rounded-full"} ${
                      selected ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 text-ink-500"
                    }`}
                  >
                    {selected ? <Check className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
                  </span>
                  {option.text}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button className="btn-secondary" disabled={currentIndex === 0} onClick={() => setCurrentIndex((i) => i - 1)}>
              <ArrowLeft className="h-4 w-4" /> Previous
            </button>
            {isLast ? (
              <button className="btn-primary" onClick={() => setConfirmOpen(true)} disabled={submitting}>
                Submit Quiz
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setCurrentIndex((i) => i + 1)}>
                Next <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <aside className="card h-fit p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Questions</p>
          <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
            {attempt.questions.map((q, i) => {
              const answered = q.selectedOptionIds.length > 0;
              const isCurrent = i === currentIndex;
              return (
                <button
                  key={q.questionId}
                  onClick={() => setCurrentIndex(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                    isCurrent
                      ? "bg-brand-600 text-white"
                      : answered
                        ? "bg-accent-100 text-accent-700"
                        : "bg-ink-100 text-ink-500 hover:bg-ink-200"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 text-xs text-ink-500">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-500" /> Answered
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-ink-200" /> Unanswered
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-600" /> Current
            </div>
          </div>
          <button className="btn-danger btn-sm mt-4 w-full" onClick={() => setConfirmOpen(true)} disabled={submitting}>
            Submit Quiz
          </button>
        </aside>
      </main>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit quiz?"
        message={`You've answered ${answeredCount} of ${totalQuestions} questions. Once submitted, you can't change your answers. Are you sure you want to submit?`}
        confirmLabel="Submit"
        loading={submitting}
        onConfirm={() => handleSubmit(false)}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
