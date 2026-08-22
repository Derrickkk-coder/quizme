import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { BookOpenCheck, Clock, ListChecks, PlayCircle, RotateCcw } from "lucide-react";
import { getStudentQuizzes } from "../../api/student";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { DifficultyBadge } from "../../components/ui/StatusBadge";
import { formatDateTime, formatDuration, formatPercent } from "../../utils/format";
import { Quiz } from "../../types";

type Tab = "available" | "upcoming" | "completed";

export default function MyQuizzesPage() {
  const [tab, setTab] = useState<Tab>("available");
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["student", "quizzes"], queryFn: getStudentQuizzes });

  if (isLoading) return <PageLoader />;

  const tabs: { key: Tab; label: string; icon: typeof BookOpenCheck; count: number }[] = [
    { key: "available", label: "Available", icon: PlayCircle, count: data?.available.length ?? 0 },
    { key: "upcoming", label: "Upcoming", icon: Clock, count: data?.upcoming.length ?? 0 },
    { key: "completed", label: "Completed", icon: ListChecks, count: data?.completed.length ?? 0 },
  ];

  const list = data?.[tab] ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">My Quizzes</h1>
        <p className="mt-1 text-sm text-ink-500">View and take quizzes assigned to your class.</p>
      </div>

      <div className="flex gap-1 rounded-xl bg-ink-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-surface text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-700"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
            <span className="rounded-full bg-ink-100 px-1.5 text-xs text-ink-500">{t.count}</span>
          </button>
        ))}
      </div>

      {!list.length ? (
        <EmptyState title={`No ${tab} quizzes`} description="Check back later or contact your teacher." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} tab={tab} onStart={() => navigate(`/app/student/quizzes/${quiz.id}/take`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function QuizCard({ quiz, tab, onStart }: { quiz: Quiz; tab: Tab; onStart: () => void }) {
  return (
    <div className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-ink-900">{quiz.title}</h3>
        <DifficultyBadge difficulty={quiz.difficulty} />
      </div>
      <p className="mt-1 text-xs font-medium text-brand-600">{quiz.subject.name}</p>
      {quiz.description && <p className="mt-2 line-clamp-2 text-sm text-ink-500">{quiz.description}</p>}

      <dl className="mt-4 grid grid-cols-2 gap-y-2 text-xs text-ink-500">
        <div>
          <dt className="text-ink-400">Duration</dt>
          <dd className="font-medium text-ink-700">{formatDuration(quiz.durationMinutes)}</dd>
        </div>
        <div>
          <dt className="text-ink-400">Questions</dt>
          <dd className="font-medium text-ink-700">{quiz._count?.questions ?? quiz.questions?.length ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-ink-400">Attempts</dt>
          <dd className="font-medium text-ink-700">
            {quiz.attemptsUsed ?? 0} / {quiz.maxAttempts}
          </dd>
        </div>
        <div>
          <dt className="text-ink-400">{tab === "upcoming" ? "Opens" : "Closes"}</dt>
          <dd className="font-medium text-ink-700">{formatDateTime(tab === "upcoming" ? quiz.opensAt : quiz.closesAt)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex-1" />

      {tab === "available" && (
        <button onClick={onStart} className="btn-primary mt-2 w-full">
          {quiz.hasInProgressAttempt ? (
            <>
              <RotateCcw className="h-4 w-4" /> Resume quiz
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4" /> Start quiz
            </>
          )}
        </button>
      )}
      {tab === "upcoming" && (
        <button disabled className="btn-secondary mt-2 w-full">
          Not yet open
        </button>
      )}
      {tab === "completed" && (
        <div className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-center text-sm font-semibold text-ink-700">
          Best score: {formatPercent(quiz.bestPercentage)}
        </div>
      )}
    </div>
  );
}
