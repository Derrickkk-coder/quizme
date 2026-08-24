import { AttemptStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { HttpError } from "../middleware/errorHandler";
import { safeUserSelect } from "../utils/safeSelects";
import { getOrderedGradeBands, matchGrade } from "./grade";

const SUBMITTED = { in: [AttemptStatus.SUBMITTED, AttemptStatus.AUTO_SUBMITTED] };

export async function computeQuizAnalytics(quizId: string, teacherId?: string) {
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, ...(teacherId ? { teacherId } : {}) },
    include: {
      subject: true,
      class: { include: { students: true } },
      questions: { include: { question: true } },
    },
  });
  if (!quiz) throw new HttpError(404, "Quiz not found");

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId, status: SUBMITTED },
    include: { answers: true },
  });

  const totalStudents = quiz.class.students.length;
  const completedCount = attempts.length;
  const notAttempted = Math.max(0, totalStudents - completedCount);

  const percentages = attempts.map((a) => a.percentage ?? 0);
  const average = percentages.length ? percentages.reduce((s, p) => s + p, 0) / percentages.length : 0;
  const highest = percentages.length ? Math.max(...percentages) : 0;
  const lowest = percentages.length ? Math.min(...percentages) : 0;
  const passCount = attempts.filter((a) => (a.percentage ?? 0) >= quiz.passingScore).length;
  const passRate = completedCount ? (passCount / completedCount) * 100 : 0;
  const failRate = completedCount ? 100 - passRate : 0;

  const completionTimes = attempts
    .filter((a) => a.submittedAt)
    .map((a) => (a.submittedAt!.getTime() - a.startedAt.getTime()) / 60000);
  const avgCompletionMinutes = completionTimes.length
    ? completionTimes.reduce((s, t) => s + t, 0) / completionTimes.length
    : 0;

  const questionStats = new Map<string, { text: string; topic: string; correct: number; total: number }>();
  for (const qq of quiz.questions) {
    questionStats.set(qq.questionId, { text: qq.question.text, topic: qq.question.topic, correct: 0, total: 0 });
  }
  for (const attempt of attempts) {
    for (const answer of attempt.answers) {
      const stat = questionStats.get(answer.questionId);
      if (!stat) continue;
      stat.total += 1;
      if (answer.isCorrect) stat.correct += 1;
    }
  }
  const questionBreakdown = Array.from(questionStats.entries()).map(([questionId, s]) => ({
    questionId,
    text: s.text,
    topic: s.topic,
    correctRate: s.total ? Math.round((s.correct / s.total) * 1000) / 10 : 0,
    attempts: s.total,
  }));
  const mostMissed = [...questionBreakdown].sort((a, b) => a.correctRate - b.correctRate).slice(0, 5);

  const topicMap = new Map<string, { correct: number; total: number }>();
  for (const q of questionBreakdown) {
    const entry = topicMap.get(q.topic) ?? { correct: 0, total: 0 };
    entry.total += q.attempts;
    entry.correct += Math.round((q.correctRate / 100) * q.attempts);
    topicMap.set(q.topic, entry);
  }
  const topicPerformance = Array.from(topicMap.entries())
    .map(([topic, { correct, total }]) => ({ topic, correctRate: total ? Math.round((correct / total) * 1000) / 10 : 0 }))
    .sort((a, b) => a.correctRate - b.correctRate);

  return {
    quiz: { id: quiz.id, title: quiz.title, subject: quiz.subject.name, class: quiz.class.name, passingScore: quiz.passingScore },
    totalStudents,
    completedCount,
    notAttempted,
    average: Math.round(average * 10) / 10,
    highest: Math.round(highest * 10) / 10,
    lowest: Math.round(lowest * 10) / 10,
    passRate: Math.round(passRate * 10) / 10,
    failRate: Math.round(failRate * 10) / 10,
    avgCompletionMinutes: Math.round(avgCompletionMinutes * 10) / 10,
    questionBreakdown,
    mostMissed,
    weakestTopics: topicPerformance.slice(0, 3),
    strongestTopics: [...topicPerformance].sort((a, b) => b.correctRate - a.correctRate).slice(0, 3),
  };
}

export async function computeStudentPerformance(studentId: string, teacherId?: string) {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: { user: { select: safeUserSelect }, class: true },
  });
  if (!student) throw new HttpError(404, "Student not found");

  const attempts = await prisma.quizAttempt.findMany({
    where: {
      studentId,
      status: SUBMITTED,
      ...(teacherId ? { quiz: { teacherId } } : {}),
    },
    include: {
      quiz: { include: { subject: true } },
      answers: { include: { question: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  const percentages = attempts.map((a) => a.percentage ?? 0);
  const overallAverage = percentages.length ? percentages.reduce((s, p) => s + p, 0) / percentages.length : 0;
  const bestScore = percentages.length ? Math.max(...percentages) : 0;
  const lowestScore = percentages.length ? Math.min(...percentages) : 0;

  const completionTimes = attempts
    .filter((a) => a.submittedAt)
    .map((a) => (a.submittedAt!.getTime() - a.startedAt.getTime()) / 60000);
  const avgCompletionMinutes = completionTimes.length
    ? completionTimes.reduce((s, t) => s + t, 0) / completionTimes.length
    : 0;

  const subjectMap = new Map<string, { total: number; count: number }>();
  for (const a of attempts) {
    const key = a.quiz.subject.name;
    const entry = subjectMap.get(key) ?? { total: 0, count: 0 };
    entry.total += a.percentage ?? 0;
    entry.count += 1;
    subjectMap.set(key, entry);
  }
  const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, { total, count }]) => ({
    subject,
    averagePercentage: Math.round((total / count) * 10) / 10,
    attempts: count,
  }));

  const topicMap = new Map<string, { correct: number; total: number }>();
  for (const a of attempts) {
    for (const ans of a.answers) {
      const entry = topicMap.get(ans.question.topic) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (ans.isCorrect) entry.correct += 1;
      topicMap.set(ans.question.topic, entry);
    }
  }
  const topicPerformance = Array.from(topicMap.entries())
    .map(([topic, { correct, total }]) => ({ topic, correctRate: total ? Math.round((correct / total) * 1000) / 10 : 0 }))
    .sort((a, b) => b.correctRate - a.correctRate);

  const trend = attempts.map((a) => ({
    quizTitle: a.quiz.title,
    date: a.submittedAt,
    percentage: a.percentage ?? 0,
  }));

  // How the student's overall grade compares to their classmates'.
  let gradeDistribution: { grade: string; count: number }[] = [];
  let myGrade: string | null = null;

  if (student.classId) {
    const classmates = await prisma.studentProfile.findMany({
      where: { classId: student.classId },
      select: { id: true },
    });
    const classmateIds = classmates.map((c) => c.id);

    const classAttempts = await prisma.quizAttempt.findMany({
      where: {
        studentId: { in: classmateIds },
        status: SUBMITTED,
        ...(teacherId ? { quiz: { teacherId } } : {}),
      },
      select: { studentId: true, percentage: true },
    });

    const percentagesByStudent = new Map<string, number[]>();
    for (const a of classAttempts) {
      const arr = percentagesByStudent.get(a.studentId) ?? [];
      arr.push(a.percentage ?? 0);
      percentagesByStudent.set(a.studentId, arr);
    }

    const bands = await getOrderedGradeBands();
    const counts = new Map<string, number>(bands.map((b) => [b.grade, 0]));

    for (const [sId, percs] of percentagesByStudent.entries()) {
      // Only count classmates who've actually attempted something, so
      // students with zero attempts don't pad out the lowest grade band.
      const avg = percs.reduce((s, p) => s + p, 0) / percs.length;
      const grade = matchGrade(avg, bands);
      counts.set(grade, (counts.get(grade) ?? 0) + 1);
      if (sId === studentId) myGrade = grade;
    }

    gradeDistribution = bands.map((b) => ({ grade: b.grade, count: counts.get(b.grade) ?? 0 }));
  }

  return {
    student: { id: student.id, name: student.user.name, class: student.class?.name ?? null, studentCode: student.studentCode },
    overallAverage: Math.round(overallAverage * 10) / 10,
    attemptsCount: attempts.length,
    bestScore: Math.round(bestScore * 10) / 10,
    lowestScore: Math.round(lowestScore * 10) / 10,
    avgCompletionMinutes: Math.round(avgCompletionMinutes * 10) / 10,
    subjectPerformance,
    strengths: topicPerformance.slice(0, 3),
    weaknesses: [...topicPerformance].reverse().slice(0, 3),
    trend,
    gradeDistribution,
    myGrade,
  };
}

export async function computeClassLeaderboard(studentId: string) {
  const student = await prisma.studentProfile.findUnique({ where: { id: studentId }, include: { class: true } });
  if (!student) throw new HttpError(404, "Student not found");
  if (!student.classId) return { class: null, rows: [] };

  const classmates = await prisma.studentProfile.findMany({
    where: { classId: student.classId },
    include: { user: { select: safeUserSelect } },
  });
  const classmateIds = classmates.map((c) => c.id);

  const attempts = await prisma.quizAttempt.findMany({
    where: { studentId: { in: classmateIds }, status: SUBMITTED },
    select: { studentId: true, percentage: true },
  });

  const statsByStudent = new Map<string, { total: number; count: number }>();
  for (const a of attempts) {
    const entry = statsByStudent.get(a.studentId) ?? { total: 0, count: 0 };
    entry.total += a.percentage ?? 0;
    entry.count += 1;
    statsByStudent.set(a.studentId, entry);
  }

  const rows = classmates
    .map((c) => {
      const stats = statsByStudent.get(c.id);
      return {
        studentId: c.id,
        name: c.user.name,
        quizzesCompleted: stats?.count ?? 0,
        averagePercentage: stats ? Math.round((stats.total / stats.count) * 10) / 10 : null,
        isYou: c.id === studentId,
      };
    })
    .filter((r) => r.quizzesCompleted > 0)
    .sort((a, b) => (b.averagePercentage ?? 0) - (a.averagePercentage ?? 0))
    .map((r, i) => ({ ...r, rank: i + 1 }));

  return { class: student.class?.name ?? null, rows };
}
