export type Role = "STUDENT" | "TEACHER" | "ADMIN";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_SELECT";
export type QuizStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "CLOSED";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED";
export type NotificationType =
  | "QUIZ_ASSIGNED"
  | "QUIZ_STARTING_SOON"
  | "QUIZ_DEADLINE"
  | "RESULT_AVAILABLE"
  | "FEEDBACK"
  | "SUBMISSION"
  | "ANNOUNCEMENT"
  | "SYSTEM";

export interface SchoolClass {
  id: string;
  name: string;
  level: string | null;
  createdAt: string;
  _count?: { students: number; quizzes: number };
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  createdAt: string;
  _count?: { quizzes: number; questions: number };
  assignments?: TeacherClassSubject[];
}

export interface TeacherClassSubject {
  id: string;
  teacherId: string;
  subjectId: string;
  teacher?: TeacherProfile;
  subject?: Subject;
}

export interface StudentProfile {
  id: string;
  userId: string;
  studentCode: string;
  classId: string | null;
  class?: SchoolClass | null;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  staffCode: string;
  user?: User;
  assignments?: TeacherClassSubject[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  mustResetPassword: boolean;
  createdAt: string;
  studentProfile?: StudentProfile | null;
  teacherProfile?: TeacherProfile | null;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  order?: number;
}

export interface Question {
  id: string;
  teacherId: string;
  subjectId: string;
  classId: string | null;
  topic: string;
  text: string;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  explanation: string | null;
  createdAt: string;
  options: QuestionOption[];
  subject?: Subject;
  class?: SchoolClass | null;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  questionId: string;
  order: number;
  marksOverride: number | null;
  question: Question;
}

export interface Quiz {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  subjectId: string;
  classId: string;
  teacherId: string;
  termId: string | null;
  durationMinutes: number;
  passingScore: number;
  difficulty: Difficulty;
  opensAt: string | null;
  closesAt: string | null;
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showCorrectAnswers: boolean;
  showExplanations: boolean;
  showResultsImmediately: boolean;
  status: QuizStatus;
  createdAt: string;
  updatedAt: string;
  subject: Subject;
  class: SchoolClass;
  teacher?: TeacherProfile;
  questions: QuizQuestion[];
  _count?: { attempts: number; questions?: number };
  attemptsUsed?: number;
  hasInProgressAttempt?: boolean;
  bestPercentage?: number | null;
  lastAttemptId?: string | null;
}

export interface AttemptQuestion {
  questionNumber: number;
  questionId: string;
  text: string;
  type: QuestionType;
  marks: number;
  options: { id: string; text: string; isCorrect?: boolean }[];
  selectedOptionIds: string[];
  isCorrect?: boolean;
  marksAwarded?: number;
  explanation?: string | null;
}

export interface AttemptInProgress {
  id: string;
  status: "IN_PROGRESS";
  quizId: string;
  quizTitle: string;
  subject: string;
  instructions: string | null;
  startedAt: string;
  deadlineAt: string;
  remainingSeconds: number;
  totalQuestions: number;
  answeredCount: number;
  questions: AttemptQuestion[];
}

export interface AttemptResult {
  id: string;
  status: "SUBMITTED" | "AUTO_SUBMITTED";
  quizId: string;
  quizTitle: string;
  subject: string;
  startedAt: string;
  submittedAt: string;
  score: number | null;
  totalMarks: number | null;
  percentage: number | null;
  grade: string | null;
  passed: boolean | null;
  resultsWithheld: boolean;
  teacherFeedback: string | null;
  tabSwitchCount: number;
  questions: AttemptQuestion[] | null;
}

export type Attempt = AttemptInProgress | AttemptResult;

export interface QuizAttemptSummary {
  id: string;
  quizId: string;
  studentId: string;
  attemptNumber: number;
  startedAt: string;
  submittedAt: string | null;
  status: AttemptStatus;
  score: number | null;
  totalMarks: number | null;
  percentage: number | null;
  grade: string | null;
  teacherFeedback?: string | null;
  quiz: Quiz;
  student?: { id: string; studentCode: string; class?: SchoolClass; user: User };
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actor?: { id: string; name: string; email: string; role: Role } | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface GradeBand {
  id?: string;
  grade: string;
  minPercent: number;
  maxPercent: number;
  label?: string | null;
}

export interface Term {
  id: string;
  academicYearId: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  terms: Term[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface SubjectPerformance {
  subject: string;
  averagePercentage: number;
  attempts: number;
}

export interface ClassPerformance {
  className: string;
  averagePercentage: number;
  attempts: number;
}

export interface AdminDashboardData {
  totals: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    totalSubjects: number;
    totalQuizzes: number;
    activeQuizzes: number;
    closedQuizzes: number;
    averageSchoolScore: number;
    overallPassRate: number;
    totalAttempts: number;
  };
  subjectPerformance: SubjectPerformance[];
  classPerformance: ClassPerformance[];
  monthlyActivity: { month: string; attempts: number }[];
}

export interface QuizAnalytics {
  quiz: { id: string; title: string; subject: string; class: string; passingScore: number };
  totalStudents: number;
  completedCount: number;
  notAttempted: number;
  average: number;
  highest: number;
  lowest: number;
  passRate: number;
  failRate: number;
  avgCompletionMinutes: number;
  questionBreakdown: { questionId: string; text: string; topic: string; correctRate: number; attempts: number }[];
  mostMissed: { questionId: string; text: string; topic: string; correctRate: number; attempts: number }[];
  weakestTopics: { topic: string; correctRate: number }[];
  strongestTopics: { topic: string; correctRate: number }[];
}

export interface StudentPerformance {
  student: { id: string; name: string; class: string | null; studentCode: string };
  overallAverage: number;
  attemptsCount: number;
  bestScore: number;
  lowestScore: number;
  avgCompletionMinutes: number;
  subjectPerformance: SubjectPerformance[];
  strengths: { topic: string; correctRate: number }[];
  weaknesses: { topic: string; correctRate: number }[];
  trend: { quizTitle: string; date: string; percentage: number }[];
  gradeDistribution: { grade: string; count: number }[];
  myGrade: string | null;
}
