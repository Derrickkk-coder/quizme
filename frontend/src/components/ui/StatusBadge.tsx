import { AttemptStatus, Difficulty, QuizStatus } from "../../types";

export function QuizStatusBadge({ status }: { status: QuizStatus }) {
  const map: Record<QuizStatus, string> = {
    DRAFT: "badge-gray",
    SCHEDULED: "badge-amber",
    ACTIVE: "badge-green",
    CLOSED: "badge-red",
  };
  const label: Record<QuizStatus, string> = {
    DRAFT: "Draft",
    SCHEDULED: "Scheduled",
    ACTIVE: "Active",
    CLOSED: "Closed",
  };
  return <span className={map[status]}>{label[status]}</span>;
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const map: Record<Difficulty, string> = {
    EASY: "badge-green",
    MEDIUM: "badge-amber",
    HARD: "badge-red",
  };
  const label: Record<Difficulty, string> = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };
  return <span className={map[difficulty]}>{label[difficulty]}</span>;
}

export function AttemptStatusBadge({ status }: { status: AttemptStatus }) {
  const map: Record<AttemptStatus, string> = {
    IN_PROGRESS: "badge-amber",
    SUBMITTED: "badge-green",
    AUTO_SUBMITTED: "badge-brand",
  };
  const label: Record<AttemptStatus, string> = {
    IN_PROGRESS: "In progress",
    SUBMITTED: "Submitted",
    AUTO_SUBMITTED: "Auto-submitted",
  };
  return <span className={map[status]}>{label[status]}</span>;
}

export function GradeBadge({ grade, passed }: { grade: string; passed?: boolean | null }) {
  const cls = passed === false ? "badge-red" : "badge-green";
  return <span className={cls}>{grade}</span>;
}
