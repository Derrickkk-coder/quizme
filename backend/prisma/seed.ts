import { PrismaClient, Difficulty, QuizStatus, AttemptStatus, NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { gradeForPercent, ensureDefaultGradeBands } from "../src/lib/grade";
import { generateStaffCode, generateStudentCode } from "../src/utils/codes";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Passw0rd!";

async function main() {
  console.log("Seeding QUIZME demo data...");

  await ensureDefaultGradeBands();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ─── Classes ────────────────────────────────────────────────────────
  const classNames = [
    { name: "JHS 1A", level: "JHS1" },
    { name: "JHS 1B", level: "JHS1" },
    { name: "JHS 2A", level: "JHS2" },
    { name: "JHS 2B", level: "JHS2" },
    { name: "JHS 3A", level: "JHS3" },
    { name: "JHS 3B", level: "JHS3" },
  ];
  const classes: Record<string, any> = {};
  for (const c of classNames) {
    classes[c.name] = await prisma.class.upsert({ where: { name: c.name }, update: {}, create: c });
  }

  // ─── Subjects ───────────────────────────────────────────────────────
  const subjectNames = ["Mathematics", "English Language", "Integrated Science", "Social Studies", "Computing", "Religious and Moral Education"];
  const subjects: Record<string, any> = {};
  for (const name of subjectNames) {
    subjects[name] = await prisma.subject.upsert({ where: { name }, update: {}, create: { name } });
  }

  // ─── Academic year / term ───────────────────────────────────────────
  const now = new Date();
  const year = await prisma.academicYear.upsert({
    where: { name: "2025/2026" },
    update: {},
    create: {
      name: "2025/2026",
      startDate: new Date(now.getFullYear(), 8, 1),
      endDate: new Date(now.getFullYear() + 1, 6, 31),
      isCurrent: true,
    },
  });
  const term = await prisma.term.upsert({
    where: { academicYearId_name: { academicYearId: year.id, name: "Term 1" } },
    update: {},
    create: {
      academicYearId: year.id,
      name: "Term 1",
      startDate: new Date(now.getFullYear(), 8, 1),
      endDate: new Date(now.getFullYear(), 11, 15),
      isCurrent: true,
    },
  });

  // ─── Admin ──────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "admin@quizme.com" },
    update: {},
    create: { email: "admin@quizme.com", name: "Ama Owusu", role: "ADMIN", passwordHash, isActive: true },
  });

  // ─── Teachers ───────────────────────────────────────────────────────
  async function upsertTeacher(email: string, name: string) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, role: "TEACHER", passwordHash, isActive: true },
    });
    const profile = await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, staffCode: generateStaffCode() },
    });
    return { user, profile };
  }

  const teacher1 = await upsertTeacher("teacher1@quizme.com", "Mr. Kwame Boateng");
  const teacher2 = await upsertTeacher("teacher2@quizme.com", "Mrs. Efua Mensah");

  async function assign(teacherId: string, classId: string, subjectId: string) {
    await prisma.teacherClassSubject.upsert({
      where: { teacherId_classId_subjectId: { teacherId, classId, subjectId } },
      update: {},
      create: { teacherId, classId, subjectId },
    });
  }

  await assign(teacher1.profile.id, classes["JHS 2A"].id, subjects["Mathematics"].id);
  await assign(teacher1.profile.id, classes["JHS 2B"].id, subjects["Mathematics"].id);
  await assign(teacher1.profile.id, classes["JHS 2A"].id, subjects["Integrated Science"].id);
  await assign(teacher2.profile.id, classes["JHS 1A"].id, subjects["English Language"].id);
  await assign(teacher2.profile.id, classes["JHS 1B"].id, subjects["English Language"].id);
  await assign(teacher2.profile.id, classes["JHS 1A"].id, subjects["Social Studies"].id);

  // ─── Students ───────────────────────────────────────────────────────
  const studentSeed = [
    { email: "student1@quizme.com", name: "Kofi Mensah", className: "JHS 2A" },
    { email: "student2@quizme.com", name: "Abena Asante", className: "JHS 2A" },
    { name: "Yaw Darko", className: "JHS 2A" },
    { name: "Akosua Boadi", className: "JHS 2A" },
    { name: "Kwabena Osei", className: "JHS 2A" },
    { name: "Adjoa Frimpong", className: "JHS 2A" },
    { name: "Kwesi Appiah", className: "JHS 2B" },
    { name: "Efua Danso", className: "JHS 2B" },
    { name: "Nana Yeboah", className: "JHS 1A" },
    { name: "Akua Sarpong", className: "JHS 1A" },
    { name: "Kojo Antwi", className: "JHS 1B" },
    { name: "Esi Amponsah", className: "JHS 1B" },
  ];

  const students: any[] = [];
  let counter = 1;
  for (const s of studentSeed) {
    const email = s.email ?? `student${(counter += 1) + 1}@quizme.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name: s.name, role: "STUDENT", passwordHash, isActive: true },
    });
    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, studentCode: generateStudentCode(), classId: classes[s.className].id },
    });
    students.push({ user, profile, className: s.className });
  }

  // ─── Question bank (Mathematics — teacher1) ────────────────────────
  type Q = { topic: string; text: string; difficulty: Difficulty; options: { text: string; isCorrect: boolean }[]; explanation: string };

  const mathQuestions: Q[] = [
    {
      topic: "Algebra",
      text: "If 2x + 4 = 12, what is the value of x?",
      difficulty: Difficulty.EASY,
      options: [{ text: "2", isCorrect: false }, { text: "4", isCorrect: true }, { text: "6", isCorrect: false }, { text: "8", isCorrect: false }],
      explanation: "Subtract 4 from both sides to get 2x = 8, then divide by 2 to get x = 4.",
    },
    {
      topic: "Algebra",
      text: "Simplify: 3(x + 2) - 4",
      difficulty: Difficulty.MEDIUM,
      options: [{ text: "3x + 2", isCorrect: true }, { text: "3x + 6", isCorrect: false }, { text: "3x - 2", isCorrect: false }, { text: "7x", isCorrect: false }],
      explanation: "3(x + 2) = 3x + 6, then 3x + 6 - 4 = 3x + 2.",
    },
    {
      topic: "Algebra",
      text: "Solve for y: 5y - 3 = 2y + 9",
      difficulty: Difficulty.MEDIUM,
      options: [{ text: "y = 2", isCorrect: false }, { text: "y = 3", isCorrect: false }, { text: "y = 4", isCorrect: true }, { text: "y = 6", isCorrect: false }],
      explanation: "5y - 2y = 9 + 3, so 3y = 12, giving y = 4.",
    },
    {
      topic: "Algebra",
      text: "What is the coefficient of x in the expression 7x + 9?",
      difficulty: Difficulty.EASY,
      options: [{ text: "9", isCorrect: false }, { text: "7", isCorrect: true }, { text: "x", isCorrect: false }, { text: "16", isCorrect: false }],
      explanation: "The coefficient is the number multiplying the variable, which is 7.",
    },
    {
      topic: "Geometry",
      text: "How many degrees are in the interior angles of a triangle?",
      difficulty: Difficulty.EASY,
      options: [{ text: "90°", isCorrect: false }, { text: "180°", isCorrect: true }, { text: "270°", isCorrect: false }, { text: "360°", isCorrect: false }],
      explanation: "The sum of interior angles of any triangle is always 180°.",
    },
    {
      topic: "Geometry",
      text: "What is the area of a rectangle with length 8cm and width 5cm?",
      difficulty: Difficulty.EASY,
      options: [{ text: "13 cm²", isCorrect: false }, { text: "26 cm²", isCorrect: false }, { text: "40 cm²", isCorrect: true }, { text: "45 cm²", isCorrect: false }],
      explanation: "Area of a rectangle = length × width = 8 × 5 = 40 cm².",
    },
    {
      topic: "Geometry",
      text: "A regular hexagon has how many sides?",
      difficulty: Difficulty.MEDIUM,
      options: [{ text: "5", isCorrect: false }, { text: "6", isCorrect: true }, { text: "7", isCorrect: false }, { text: "8", isCorrect: false }],
      explanation: "Hexa- means six, so a hexagon has 6 sides.",
    },
    {
      topic: "Geometry",
      text: "What is the circumference of a circle with radius 7cm? (use π ≈ 22/7)",
      difficulty: Difficulty.HARD,
      options: [{ text: "22 cm", isCorrect: false }, { text: "44 cm", isCorrect: true }, { text: "49 cm", isCorrect: false }, { text: "154 cm", isCorrect: false }],
      explanation: "Circumference = 2πr = 2 × 22/7 × 7 = 44 cm.",
    },
    {
      topic: "Fractions",
      text: "What is 1/2 + 1/4?",
      difficulty: Difficulty.EASY,
      options: [{ text: "1/6", isCorrect: false }, { text: "2/6", isCorrect: false }, { text: "3/4", isCorrect: true }, { text: "1", isCorrect: false }],
      explanation: "Convert 1/2 to 2/4, then 2/4 + 1/4 = 3/4.",
    },
    {
      topic: "Fractions",
      text: "Which fraction is equivalent to 0.75?",
      difficulty: Difficulty.MEDIUM,
      options: [{ text: "1/4", isCorrect: false }, { text: "1/2", isCorrect: false }, { text: "3/4", isCorrect: true }, { text: "3/5", isCorrect: false }],
      explanation: "0.75 = 75/100, which simplifies to 3/4.",
    },
    {
      topic: "Fractions",
      text: "Simplify 8/12 to its lowest terms.",
      difficulty: Difficulty.MEDIUM,
      options: [{ text: "2/3", isCorrect: true }, { text: "4/6", isCorrect: false }, { text: "3/4", isCorrect: false }, { text: "1/2", isCorrect: false }],
      explanation: "Divide numerator and denominator by their GCD, 4, to get 2/3.",
    },
    {
      topic: "Fractions",
      text: "What is 2/3 of 90?",
      difficulty: Difficulty.HARD,
      options: [{ text: "30", isCorrect: false }, { text: "45", isCorrect: false }, { text: "60", isCorrect: true }, { text: "75", isCorrect: false }],
      explanation: "90 ÷ 3 = 30, then 30 × 2 = 60.",
    },
  ];

  const createdMathQuestions = [];
  for (const q of mathQuestions) {
    const created = await prisma.question.create({
      data: {
        teacherId: teacher1.profile.id,
        subjectId: subjects["Mathematics"].id,
        classId: classes["JHS 2A"].id,
        topic: q.topic,
        text: q.text,
        difficulty: q.difficulty,
        marks: 1,
        explanation: q.explanation,
        options: { create: q.options.map((o, i) => ({ ...o, order: i })) },
      },
      include: { options: true },
    });
    createdMathQuestions.push(created);
  }

  // ─── Question bank (English — teacher2) ────────────────────────────
  const englishQuestions: Q[] = [
    {
      topic: "Grammar",
      text: 'Choose the correct form: "She ___ to school every day."',
      difficulty: Difficulty.EASY,
      options: [{ text: "go", isCorrect: false }, { text: "goes", isCorrect: true }, { text: "going", isCorrect: false }, { text: "gone", isCorrect: false }],
      explanation: 'Third person singular subjects ("she") take the -s form of the verb in the present simple tense.',
    },
    {
      topic: "Grammar",
      text: "Identify the noun in the sentence: 'The dog barked loudly.'",
      difficulty: Difficulty.EASY,
      options: [{ text: "barked", isCorrect: false }, { text: "loudly", isCorrect: false }, { text: "dog", isCorrect: true }, { text: "the", isCorrect: false }],
      explanation: "A noun names a person, place, or thing — 'dog' is the thing in this sentence.",
    },
    {
      topic: "Comprehension",
      text: "What is a synonym for 'happy'?",
      difficulty: Difficulty.EASY,
      options: [{ text: "Sad", isCorrect: false }, { text: "Joyful", isCorrect: true }, { text: "Angry", isCorrect: false }, { text: "Tired", isCorrect: false }],
      explanation: "'Joyful' means the same as 'happy'.",
    },
    {
      topic: "Comprehension",
      text: "What is an antonym for 'increase'?",
      difficulty: Difficulty.MEDIUM,
      options: [{ text: "Decrease", isCorrect: true }, { text: "Expand", isCorrect: false }, { text: "Raise", isCorrect: false }, { text: "Grow", isCorrect: false }],
      explanation: "'Decrease' means the opposite of 'increase'.",
    },
  ];

  const createdEnglishQuestions = [];
  for (const q of englishQuestions) {
    const created = await prisma.question.create({
      data: {
        teacherId: teacher2.profile.id,
        subjectId: subjects["English Language"].id,
        classId: classes["JHS 1A"].id,
        topic: q.topic,
        text: q.text,
        difficulty: q.difficulty,
        marks: 1,
        explanation: q.explanation,
        options: { create: q.options.map((o, i) => ({ ...o, order: i })) },
      },
      include: { options: true },
    });
    createdEnglishQuestions.push(created);
  }

  // ─── Helper: create a fully graded, already-submitted attempt ──────
  async function createGradedAttempt(
    quiz: { id: string; passingScore: number },
    studentProfile: { id: string; userId: string },
    questions: { id: string; options: { id: string; isCorrect: boolean }[] }[],
    correctPattern: boolean[],
    startedDaysAgo: number
  ) {
    const questionOrder = questions.map((q) => ({ questionId: q.id, optionOrder: q.options.map((o) => o.id) }));
    const startedAt = new Date(Date.now() - startedDaysAgo * 24 * 60 * 60 * 1000);
    const submittedAt = new Date(startedAt.getTime() + 12 * 60 * 1000);

    let score = 0;
    const totalMarks = questions.length;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        studentId: studentProfile.id,
        attemptNumber: 1,
        startedAt,
        deadlineAt: new Date(startedAt.getTime() + 30 * 60 * 1000),
        submittedAt,
        status: AttemptStatus.SUBMITTED,
        questionOrder: questionOrder as any,
        score: 0,
        totalMarks,
        percentage: 0,
        grade: "F",
      },
    });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const shouldBeCorrect = correctPattern[i % correctPattern.length];
      const correctOption = q.options.find((o) => o.isCorrect)!;
      const wrongOption = q.options.find((o) => !o.isCorrect)!;
      const selected = shouldBeCorrect ? correctOption : wrongOption;
      if (shouldBeCorrect) score += 1;

      await prisma.answer.create({
        data: {
          attemptId: attempt.id,
          questionId: q.id,
          selectedOptionId: selected.id,
          isCorrect: shouldBeCorrect,
          marksAwarded: shouldBeCorrect ? 1 : 0,
        },
      });
    }

    const percentage = (score / totalMarks) * 100;
    const grade = await gradeForPercent(percentage);

    await prisma.quizAttempt.update({ where: { id: attempt.id }, data: { score, percentage, grade } });

    await prisma.notification.create({
      data: {
        userId: studentProfile.userId,
        type: NotificationType.RESULT_AVAILABLE,
        title: "Result available",
        message: `Your result is ready: ${Math.round(percentage)}% (${grade}).`,
      },
    });

    return attempt;
  }

  // ─── Quizzes ─────────────────────────────────────────────────────────

  const closedMathQuiz = await prisma.quiz.create({
    data: {
      title: "Algebra & Geometry Foundations",
      description: "A foundational quiz covering algebra and geometry basics for Term 1.",
      instructions: "Read each question carefully. You have 30 minutes to complete this quiz. Good luck!",
      subjectId: subjects["Mathematics"].id,
      classId: classes["JHS 2A"].id,
      teacherId: teacher1.profile.id,
      termId: term.id,
      durationMinutes: 30,
      passingScore: 50,
      difficulty: Difficulty.MEDIUM,
      opensAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      closesAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      maxAttempts: 1,
      randomizeQuestions: true,
      randomizeOptions: true,
      showCorrectAnswers: true,
      showExplanations: true,
      showResultsImmediately: true,
      status: QuizStatus.CLOSED,
      questions: { create: createdMathQuestions.slice(0, 8).map((q, i) => ({ questionId: q.id, order: i })) },
    },
  });

  const jhs2aStudents = students.filter((s) => s.className === "JHS 2A");
  const performancePatterns = [
    [true, true, true, true, true, true, true, false], // strong student
    [true, true, true, false, true, true, false, false], // above average
    [true, false, true, true, false, true, false, false], // average
    [true, true, false, false, false, true, false, false], // below average
    [false, true, false, false, true, false, false, false], // weak
    [true, true, true, true, true, false, true, true], // strong student
  ];
  for (let i = 0; i < jhs2aStudents.length; i++) {
    await createGradedAttempt(
      closedMathQuiz,
      jhs2aStudents[i].profile,
      createdMathQuestions.slice(0, 8),
      performancePatterns[i % performancePatterns.length],
      2 + i
    );
  }

  const activeMathQuiz = await prisma.quiz.create({
    data: {
      title: "Fractions Practice Quiz",
      description: "Practice quiz on fractions to prepare for the end-of-term exam.",
      instructions: "You have 20 minutes. Once you start, the timer cannot be paused.",
      subjectId: subjects["Mathematics"].id,
      classId: classes["JHS 2A"].id,
      teacherId: teacher1.profile.id,
      termId: term.id,
      durationMinutes: 20,
      passingScore: 50,
      difficulty: Difficulty.MEDIUM,
      opensAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      closesAt: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
      maxAttempts: 2,
      randomizeQuestions: true,
      randomizeOptions: true,
      showCorrectAnswers: true,
      showExplanations: true,
      showResultsImmediately: true,
      status: QuizStatus.ACTIVE,
      questions: { create: createdMathQuestions.slice(8, 12).map((q, i) => ({ questionId: q.id, order: i })) },
    },
  });

  await prisma.quiz.create({
    data: {
      title: "Geometry Challenge",
      description: "An advanced geometry quiz — opens next week.",
      instructions: "You will have 25 minutes to answer all questions.",
      subjectId: subjects["Mathematics"].id,
      classId: classes["JHS 2A"].id,
      teacherId: teacher1.profile.id,
      termId: term.id,
      durationMinutes: 25,
      passingScore: 50,
      difficulty: Difficulty.HARD,
      opensAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      closesAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      maxAttempts: 1,
      randomizeQuestions: true,
      randomizeOptions: true,
      showCorrectAnswers: true,
      showExplanations: true,
      showResultsImmediately: false,
      status: QuizStatus.SCHEDULED,
      questions: { create: createdMathQuestions.slice(4, 8).map((q, i) => ({ questionId: q.id, order: i })) },
    },
  });

  await prisma.quiz.create({
    data: {
      title: "Grammar & Vocabulary Quiz 1",
      description: "First quiz of the term covering basic grammar and vocabulary.",
      instructions: "Answer all questions. You have 15 minutes.",
      subjectId: subjects["English Language"].id,
      classId: classes["JHS 1A"].id,
      teacherId: teacher2.profile.id,
      termId: term.id,
      durationMinutes: 15,
      passingScore: 50,
      difficulty: Difficulty.EASY,
      opensAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      closesAt: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000),
      maxAttempts: 1,
      randomizeQuestions: true,
      randomizeOptions: true,
      showCorrectAnswers: true,
      showExplanations: true,
      showResultsImmediately: true,
      status: QuizStatus.ACTIVE,
      questions: { create: createdEnglishQuestions.map((q, i) => ({ questionId: q.id, order: i })) },
    },
  });

  // A draft quiz to show the Draft status in the teacher dashboard.
  await prisma.quiz.create({
    data: {
      title: "Social Studies Mid-Term (Draft)",
      description: "Draft — still being prepared.",
      subjectId: subjects["Social Studies"].id,
      classId: classes["JHS 1A"].id,
      teacherId: teacher2.profile.id,
      termId: term.id,
      durationMinutes: 20,
      passingScore: 50,
      difficulty: Difficulty.MEDIUM,
      maxAttempts: 1,
      status: QuizStatus.DRAFT,
    },
  });

  console.log("Seed complete.");
  console.log("Demo password for all seeded accounts:", DEMO_PASSWORD);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
