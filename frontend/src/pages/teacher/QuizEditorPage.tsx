import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GripVertical, Plus, Sparkles, Trash2, Send, XCircle } from "lucide-react";
import {
  addQuestionsToQuiz,
  autoGenerateQuizQuestions,
  createQuiz,
  getTeacherClasses,
  getTeacherQuiz,
  getTeacherSubjects,
  listQuestions,
  publishQuiz,
  closeQuiz,
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
  durationMinutes: 20,
  passingScore: 50,
  difficulty: "MEDIUM",
  maxAttempts: 1,
  randomizeQuestions: true,
  randomizeOptions: true,
  showCorrectAnswers: true,
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
      const payload = { ...form, opensAt: form.opensAt || undefined, closesAt: form.closesAt || undefined };
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{isEditing ? "Edit Quiz" : "Create Quiz"}</h1>
          <p className="mt-1 text-sm text-ink-500">Configure quiz details, timing, and questions.</p>
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
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card space-y-4 p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-ink-900">Quiz details</h2>

          <div>
            <label className="label">Title</label>
            <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Instructions for students</label>
            <textarea className="textarea" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <label className="label">Opens at</label>
              <input type="datetime-local" className="input" value={form.opensAt ?? ""} onChange={(e) => setForm({ ...form, opensAt: e.target.value })} />
            </div>
            <div>
              <label className="label">Closes at</label>
              <input type="datetime-local" className="input" value={form.closesAt ?? ""} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2 border-t border-ink-100 pt-4">
            <ToggleRow label="Randomize question order" checked={form.randomizeQuestions} onChange={(v) => setForm({ ...form, randomizeQuestions: v })} />
            <ToggleRow label="Randomize answer options" checked={form.randomizeOptions} onChange={(v) => setForm({ ...form, randomizeOptions: v })} />
            <ToggleRow label="Show correct answers after submission" checked={form.showCorrectAnswers} onChange={(v) => setForm({ ...form, showCorrectAnswers: v })} />
            <ToggleRow label="Show explanations" checked={form.showExplanations} onChange={(v) => setForm({ ...form, showExplanations: v })} />
            <ToggleRow label="Show results immediately after submission" checked={form.showResultsImmediately} onChange={(v) => setForm({ ...form, showResultsImmediately: v })} />
          </div>

          <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : isEditing ? "Save changes" : "Create Quiz"}
          </button>
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900">Questions {quiz ? `(${quiz.questions.length})` : ""}</h2>
            </div>

            {!isEditing ? (
              <EmptyState title="Save the quiz first" description="Create the quiz to start adding questions." />
            ) : (
              <>
                <div className="mb-4 flex gap-2">
                  <button type="button" className="btn-secondary btn-sm flex-1" onClick={() => setPickerOpen(true)}>
                    <Plus className="h-4 w-4" /> Add from bank
                  </button>
                  <button type="button" className="btn-secondary btn-sm flex-1" onClick={() => setAutoGenOpen(true)}>
                    <Sparkles className="h-4 w-4" /> Auto-generate
                  </button>
                </div>

                {!quiz?.questions.length ? (
                  <EmptyState title="No questions yet" description="Add questions from your bank or auto-generate a set." />
                ) : (
                  <ul className="space-y-2">
                    {quiz.questions.map((qq) => (
                      <li key={qq.id} className="flex items-start gap-2 rounded-lg border border-ink-100 p-3">
                        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" />
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm text-ink-800">{qq.question.text}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <DifficultyBadge difficulty={qq.question.difficulty} />
                            <span className="text-xs text-ink-400">{qq.question.topic}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost btn-sm text-red-600"
                          onClick={() => removeQuestionMutation.mutate(qq.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1.5">
      <span className="text-sm text-ink-700">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
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
            <label key={q.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${checked ? "border-brand-400 bg-brand-50" : "border-ink-100"}`}>
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
        <p className="text-sm text-ink-500">QUIZME will pick matching questions at random from your question bank for this quiz's subject.</p>
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
