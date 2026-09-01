import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Calendar,
  Check,
  ClipboardList,
  Eye,
  GripVertical,
  Layers,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Shuffle,
  Sparkles,
  Timer,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  addQuestionsToQuiz,
  autoGenerateQuizQuestions,
  createQuiz,
  getTeacherClasses,
  getTeacherQuiz,
  getTeacherSubjects,
  getTeacherTerms,
  listQuestions,
  publishQuiz,
  closeQuiz,
  unpublishQuiz,
  QuizPayload,
  removeQuestionFromQuiz,
  updateQuiz,
} from "../../api/teacher";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { QuizStatusBadge, DifficultyBadge } from "../../components/ui/StatusBadge";
import { Difficulty } from "../../types";

const emptyForm: QuizPayload = {
  title: "",
  description: "",
  instructions: "",
  subjectId: "",
  classId: "",
  termId: "",
  durationMinutes: 20,
  passingScore: 50,
  difficulty: "MEDIUM",
  maxAttempts: 1,
  randomizeQuestions: true,
  randomizeOptions: true,
  showCorrectAnswers: false,
  showExplanations: true,
  showResultsImmediately: true,
};

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function QuizEditorPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const isEditing = !!quizId;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<QuizPayload>(emptyForm);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [autoGenOpen, setAutoGenOpen] = useState(false);

  const subjectsQuery = useQuery({ queryKey: ["teacher", "subjects"], queryFn: getTeacherSubjects });
  const classesQuery = useQuery({ queryKey: ["teacher", "classes"], queryFn: getTeacherClasses });
  const termsQuery = useQuery({ queryKey: ["teacher", "terms"], queryFn: getTeacherTerms });
  const quizQuery = useQuery({
    queryKey: ["teacher", "quiz", quizId],
    queryFn: () => getTeacherQuiz(quizId!),
    enabled: isEditing,
  });

  useEffect(() => {
    const quiz = quizQuery.data?.data;
    if (quiz) {
      setForm({
        title: quiz.title,
        description: quiz.description ?? "",
        instructions: quiz.instructions ?? "",
        subjectId: quiz.subjectId,
        classId: quiz.classId,
        termId: quiz.termId ?? "",
        durationMinutes: quiz.durationMinutes,
        passingScore: quiz.passingScore,
        difficulty: quiz.difficulty,
        opensAt: toLocalInput(quiz.opensAt),
        closesAt: toLocalInput(quiz.closesAt),
        maxAttempts: quiz.maxAttempts,
        randomizeQuestions: quiz.randomizeQuestions,
        randomizeOptions: quiz.randomizeOptions,
        showCorrectAnswers: quiz.showCorrectAnswers,
        showExplanations: quiz.showExplanations,
        showResultsImmediately: quiz.showResultsImmediately,
      });
    }
  }, [quizQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, termId: form.termId || undefined, opensAt: form.opensAt || undefined, closesAt: form.closesAt || undefined };
      if (isEditing) return updateQuiz(quizId!, payload);
      return createQuiz(payload);
    },
    onSuccess: (res) => {
      showToast("Quiz saved", "success");
      queryClient.invalidateQueries({ queryKey: ["teacher", "quizzes"] });
      if (!isEditing) {
        navigate(`/app/teacher/quizzes/${res.data.id}/edit`, { replace: true });
      } else {
        queryClient.invalidateQueries({ queryKey: ["teacher", "quiz", quizId] });
      }
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishQuiz(quizId!),
    onSuccess: () => {
      showToast("Quiz published to the class", "success");
      queryClient.invalidateQueries({ queryKey: ["teacher", "quiz", quizId] });
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const closeMutation = useMutation({
    mutationFn: () => closeQuiz(quizId!),
    onSuccess: () => {
      showToast("Quiz closed", "success");
      queryClient.invalidateQueries({ queryKey: ["teacher", "quiz", quizId] });
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const reopenMutation = useMutation({
    mutationFn: () => unpublishQuiz(quizId!),
    onSuccess: () => {
      showToast("Quiz reopened as a draft — existing results are unaffected. Publish it again when you're ready.", "success");
      queryClient.invalidateQueries({ queryKey: ["teacher", "quiz", quizId] });
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const removeQuestionMutation = useMutation({
    mutationFn: (quizQuestionId: string) => removeQuestionFromQuiz(quizId!, quizQuestionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", "quiz", quizId] });
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  if (isEditing && quizQuery.isLoading) return <PageLoader />;

  const quiz = quizQuery.data?.data;
  const totalMarks = quiz?.questions.reduce((sum, qq) => sum + (qq.marksOverride ?? qq.question.marks), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-200">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">{isEditing ? "Edit Quiz" : "Create Quiz"}</h1>
            <p className="mt-0.5 text-sm text-ink-500">Configure quiz details, timing, and questions.</p>
          </div>
        </div>
        {quiz && (
          <div className="flex items-center gap-2">
            <QuizStatusBadge status={quiz.status} />
            {quiz.status === "DRAFT" && (
              <button className="btn-primary btn-sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
                <Send className="h-4 w-4" /> Publish
              </button>
            )}
            {(quiz.status === "ACTIVE" || quiz.status === "SCHEDULED") && (
              <button className="btn-secondary btn-sm" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
                <XCircle className="h-4 w-4" /> Close
              </button>
            )}
            {quiz.status === "CLOSED" && (
              <button
                className="btn-secondary btn-sm"
                onClick={() => reopenMutation.mutate()}
                disabled={reopenMutation.isPending}
                title="Moves this quiz back to draft. Existing student results are kept — publish again to let students attempt it."
              >
                <RotateCcw className="h-4 w-4" /> Reopen
              </button>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        <div className="card divide-y divide-ink-100 lg:col-span-2">
          <FieldSection icon={<BookOpen className="h-4 w-4" />} title="Basics" description="What students will see before they start.">
            <div>
              <label className="label">Title</label>
              <input required className="input" placeholder="e.g. Mid-term Algebra Quiz" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="textarea" placeholder="A short summary shown on the quiz list" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Instructions for students</label>
              <textarea className="textarea" placeholder="Shown at the top of the quiz once students start" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
            </div>
          </FieldSection>

          <FieldSection icon={<Layers className="h-4 w-4" />} title="Classification" description="Where this quiz lives in your subject and class.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label">Subject</label>
                <select required className="select" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                  <option value="">Select subject</option>
                  {subjectsQuery.data?.data.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Class</label>
                <select required className="select" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                  <option value="">Select class</option>
                  {classesQuery.data?.data.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Difficulty</label>
                <select className="select" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
              <div>
                <label className="label">Term (optional)</label>
                <select className="select" value={form.termId ?? ""} onChange={(e) => setForm({ ...form, termId: e.target.value })}>
                  <option value="">No term</option>
                  {termsQuery.data?.data.map((year) => (
                    <optgroup key={year.id} label={year.name}>
                      {year.terms.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          </FieldSection>

          <FieldSection icon={<Timer className="h-4 w-4" />} title="Timing & attempts" description="How long students get, and when the quiz is open.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Duration (minutes)</label>
                <input type="number" min={1} required className="input" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Passing score (%)</label>
                <input type="number" min={0} max={100} required className="input" value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">Max attempts</label>
                <input type="number" min={1} required className="input" value={form.maxAttempts} onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-ink-400" /> Opens at
                </label>
                <input type="datetime-local" className="input" value={form.opensAt ?? ""} onChange={(e) => setForm({ ...form, opensAt: e.target.value })} />
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-ink-400" /> Closes at
                </label>
                <input type="datetime-local" className="input" value={form.closesAt ?? ""} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} />
              </div>
            </div>
          </FieldSection>

          <FieldSection icon={<Settings2 className="h-4 w-4" />} title="Student experience" description="Control what students see and how questions are ordered.">
            <div className="space-y-1">
              <SwitchRow
                icon={<Shuffle className="h-4 w-4" />}
                label="Randomize question order"
                description="Each student sees questions in a different order"
                checked={form.randomizeQuestions}
                onChange={(v) => setForm({ ...form, randomizeQuestions: v })}
              />
              <SwitchRow
                icon={<Shuffle className="h-4 w-4" />}
                label="Randomize answer options"
                description="Each student sees answer choices shuffled"
                checked={form.randomizeOptions}
                onChange={(v) => setForm({ ...form, randomizeOptions: v })}
              />
              <SwitchRow
                icon={<Eye className="h-4 w-4" />}
                label="Show correct answers after submission"
                description="Reveal which option was right once a student submits"
                checked={form.showCorrectAnswers}
                onChange={(v) => setForm({ ...form, showCorrectAnswers: v })}
              />
              <SwitchRow
                icon={<ListChecks className="h-4 w-4" />}
                label="Show explanations"
                description="Only applies if correct answers are shown"
                checked={form.showExplanations}
                onChange={(v) => setForm({ ...form, showExplanations: v })}
              />
              <SwitchRow
                icon={<Check className="h-4 w-4" />}
                label="Show results immediately after submission"
                description="Otherwise students wait until you release results"
                checked={form.showResultsImmediately}
                onChange={(v) => setForm({ ...form, showResultsImmediately: v })}
              />
            </div>
          </FieldSection>

          <div className="p-5">
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={saveMutation.isPending}>
              <Save className="h-4 w-4" /> {saveMutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Create Quiz"}
            </button>
          </div>
        </div>

        <div className="lg:sticky lg:top-6">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                  <ListChecks className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-ink-900">Questions</h2>
              </div>
              {quiz && quiz.questions.length > 0 && (
                <span className="badge-brand">{quiz.questions.length} · {totalMarks} mark{totalMarks === 1 ? "" : "s"}</span>
              )}
            </div>

            {!isEditing ? (
              <EmptyState icon={<Save className="h-6 w-6" />} title="Save the quiz first" description="Create the quiz to start adding questions." />
            ) : (
              <>
                <div className="mb-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-ink-200 bg-surface px-3 py-3 text-center transition-colors hover:border-brand-300 hover:bg-brand-50"
                    onClick={() => setPickerOpen(true)}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Plus className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold text-ink-700">Add from bank</span>
                  </button>
                  <button
                    type="button"
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-ink-200 bg-surface px-3 py-3 text-center transition-colors hover:border-accent-300 hover:bg-accent-50"
                    onClick={() => setAutoGenOpen(true)}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-semibold text-ink-700">Auto-generate</span>
                  </button>
                </div>

                {!quiz?.questions.length ? (
                  <EmptyState title="No questions yet" description="Add questions from your bank or auto-generate a set." />
                ) : (
                  <ul className="space-y-2">
                    {quiz.questions.map((qq, i) => (
                      <li key={qq.id} className="group flex items-start gap-2.5 rounded-xl border border-ink-100 p-3 transition-colors hover:border-ink-200 hover:bg-ink-50/60">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-[10px] font-bold text-ink-500">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm text-ink-800">{qq.question.text}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <DifficultyBadge difficulty={qq.question.difficulty} />
                            <span className="text-xs text-ink-400">{qq.question.topic}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-lg p-1.5 text-ink-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          onClick={() => removeQuestionMutation.mutate(qq.id)}
                          title="Remove question"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-ink-200" />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </form>

      {isEditing && quiz && (
        <QuestionPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          quizId={quiz.id}
          defaultSubjectId={quiz.subjectId}
          existingQuestionIds={quiz.questions.map((q) => q.questionId)}
        />
      )}
      {isEditing && quiz && (
        <AutoGenerateModal open={autoGenOpen} onClose={() => setAutoGenOpen(false)} quizId={quiz.id} defaultSubjectId={quiz.subjectId} defaultClassId={quiz.classId} />
      )}
    </div>
  );
}

function FieldSection({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">{icon}</div>
        <div>
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          {description && <p className="text-xs text-ink-400">{description}</p>}
        </div>
      </div>
      <div className="space-y-4 sm:pl-[42px]">{children}</div>
    </div>
  );
}

function SwitchRow({
  icon,
  label,
  description,
  checked,
  onChange,
}: {
  icon?: ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-ink-50">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 shrink-0 text-ink-400">{icon}</span>}
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-700">{label}</p>
          {description && <p className="text-xs text-ink-400">{description}</p>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-200 ${
          checked ? "bg-brand-600" : "bg-ink-200"
        }`}
      >
        <span className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-1"}`} />
      </button>
    </label>
  );
}

function QuestionPickerModal({
  open,
  onClose,
  quizId,
  defaultSubjectId,
  existingQuestionIds,
}: {
  open: boolean;
  onClose: () => void;
  quizId: string;
  defaultSubjectId: string;
  existingQuestionIds: string[];
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["teacher", "questions", "picker", defaultSubjectId, search],
    queryFn: () => listQuestions({ subjectId: defaultSubjectId, search: search || undefined, pageSize: 50 }),
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: () => addQuestionsToQuiz(quizId, Array.from(selected)),
    onSuccess: () => {
      showToast("Questions added", "success");
      queryClient.invalidateQueries({ queryKey: ["teacher", "quiz", quizId] });
      setSelected(new Set());
      onClose();
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const available = (data?.data ?? []).filter((q) => !existingQuestionIds.includes(q.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add questions from bank"
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!selected.size || addMutation.isPending} onClick={() => addMutation.mutate()}>
            Add {selected.size || ""} question{selected.size === 1 ? "" : "s"}
          </button>
        </>
      }
    >
      <input className="input mb-4" placeholder="Search questions…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {isLoading && <p className="text-sm text-ink-400">Loading…</p>}
        {!isLoading && !available.length && <EmptyState title="No matching questions" description="Try a different search, or create new questions in the Question Bank." />}
        {available.map((q) => {
          const checked = selected.has(q.id);
          return (
            <label key={q.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${checked ? "border-brand-400 bg-brand-50" : "border-ink-100 hover:border-ink-200"}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const next = new Set(selected);
                  if (checked) next.delete(q.id);
                  else next.add(q.id);
                  setSelected(next);
                }}
                className="mt-1 h-4 w-4 rounded border-ink-300 text-brand-600"
              />
              <div className="min-w-0">
                <p className="text-sm text-ink-800">{q.text}</p>
                <div className="mt-1 flex items-center gap-2">
                  <DifficultyBadge difficulty={q.difficulty} />
                  <span className="text-xs text-ink-400">{q.topic}</span>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </Modal>
  );
}

function AutoGenerateModal({
  open,
  onClose,
  quizId,
  defaultSubjectId,
  defaultClassId,
}: {
  open: boolean;
  onClose: () => void;
  quizId: string;
  defaultSubjectId: string;
  defaultClassId: string;
}) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [count, setCount] = useState(10);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      autoGenerateQuizQuestions(quizId, {
        subjectId: defaultSubjectId,
        classId: defaultClassId,
        topic: topic || undefined,
        difficulty: difficulty || undefined,
        count,
      }),
    onSuccess: (res) => {
      showToast(`Added ${res.meta.added} question${res.meta.added === 1 ? "" : "s"}`, "success");
      queryClient.invalidateQueries({ queryKey: ["teacher", "quiz", quizId] });
      onClose();
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Auto-generate questions"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            Generate
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-500">EduQuiz will pick matching questions at random from your question bank for this quiz's subject.</p>
        <div>
          <label className="label">Topic (optional)</label>
          <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Algebra" />
        </div>
        <div>
          <label className="label">Difficulty (optional)</label>
          <select className="select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}>
            <option value="">Mixed</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
        <div>
          <label className="label">Number of questions</label>
          <input type="number" min={1} className="input" value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </div>
      </div>
    </Modal>
  );
}
