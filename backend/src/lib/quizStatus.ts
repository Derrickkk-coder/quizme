import { Quiz, QuizStatus } from "@prisma/client";
import { prisma } from "./prisma";

// DRAFT is a manual state controlled by the teacher. Once a quiz is
// published (SCHEDULED or ACTIVE), its effective status is derived from
// the current time versus opensAt/closesAt, and CLOSED is terminal once
// the teacher (or the clock) closes it.
export function computeEffectiveStatus(quiz: Pick<Quiz, "status" | "opensAt" | "closesAt">, now: Date = new Date()): QuizStatus {
  if (quiz.status === QuizStatus.DRAFT || quiz.status === QuizStatus.CLOSED) return quiz.status;

  if (quiz.closesAt && now >= quiz.closesAt) return QuizStatus.CLOSED;
  if (quiz.opensAt && now < quiz.opensAt) return QuizStatus.SCHEDULED;
  return QuizStatus.ACTIVE;
}

export async function syncQuizStatus(quiz: Quiz): Promise<Quiz> {
  const effective = computeEffectiveStatus(quiz);
  if (effective === quiz.status) return quiz;
  return prisma.quiz.update({ where: { id: quiz.id }, data: { status: effective } });
}

export async function syncQuizStatuses(quizzes: Quiz[]): Promise<Quiz[]> {
  return Promise.all(quizzes.map((q) => syncQuizStatus(q)));
}
