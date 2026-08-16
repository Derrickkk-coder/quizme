import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import {
  createQuestion,
  deleteQuestion,
  getTeacherClasses,
  getTeacherSubjects,
  listQuestions,
  QuestionPayload,
  updateQuestion,
} from "../../api/teacher";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Pagination } from "../../components/ui/Pagination";
import { DifficultyBadge } from "../../components/ui/StatusBadge";
import { Difficulty, Question, QuestionType } from "../../types";
import { GenerateFromNotesModal } from "./GenerateFromNotesModal";

const emptyForm: QuestionPayload = {
  subjectId: "",
  classId: "",
  topic: "",
  text: "",
  type: "SINGLE_CHOICE",
  difficulty: "MEDIUM",
  marks: 1,
  explanation: "",
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
};

export default function QuestionBankPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [previewing, setPreviewing] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const subjectsQuery = useQuery({ queryKey: ["teacher", "subjects"], queryFn: getTeacherSubjects });
  const classesQuery = useQuery({ queryKey: ["teacher", "classes"], queryFn: getTeacherClasses });

  const questionsQuery = useQuery({
    queryKey: ["teacher", "questions", { page, search, subjectId, difficulty }],
    queryFn: () => listQuestions({ page, pageSize: 12, search: search || undefined, subjectId: subjectId || undefined, difficulty: difficulty || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
    onSuccess: () => {
      showToast("Question deleted", "success");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["teacher", "questions"] });
    },
    onError: (err) => {
      showToast(apiErrorMessage(err), "error");
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(q: Question) {
    setEditing(q);
    setEditorOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Question Bank</h1>
          <p className="mt-1 text-sm text-ink-500">Build a reusable library of questions for your quizzes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => setGenerateOpen(true)}>
            <Sparkles className="h-4 w-4" /> Generate from Notes
          </button>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Question
          </button>
        </div>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search questions…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="select w-auto" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setPage(1); }}>
          <option value="">All subjects</option>
          {subjectsQuery.data?.data.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select className="select w-auto" value={difficulty} onChange={(e) => { setDifficulty(e.target.value as Difficulty | ""); setPage(1); }}>
          <option value="">All difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      {questionsQuery.isLoading ? (
        <PageLoader />
      ) : !questionsQuery.data?.data.length ? (
        <EmptyState title="No questions found" description="Create your first question to build your bank." action={<button className="btn-primary" onClick={openCreate}>New Question</button>} />
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-ink-100">
            {questionsQuery.data.data.map((q) => (
              <div key={q.id} className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-800">{q.text}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <DifficultyBadge difficulty={q.difficulty} />
                    {q.type === "MULTIPLE_SELECT" && <span className="badge-brand">Multi-select</span>}
                    <span className="badge-gray">{q.subject?.name}</span>
                    <span className="text-ink-400">{q.topic}</span>
                    <span className="text-ink-400">· {q.marks} mark{q.marks > 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button className="btn-ghost btn-sm" onClick={() => setPreviewing(q)} title="Preview">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => openEdit(q)} title="Edit">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className="btn-ghost btn-sm text-red-600" onClick={() => setDeleteTarget(q)} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <Pagination meta={questionsQuery.data.meta} onPageChange={setPage} />
        </div>
      )}

      <QuestionEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editing={editing}
        subjects={subjectsQuery.data?.data ?? []}
        classes={classesQuery.data?.data ?? []}
      />

      <GenerateFromNotesModal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        subjects={subjectsQuery.data?.data ?? []}
        classes={classesQuery.data?.data ?? []}
      />

      <Modal open={!!previewing} onClose={() => setPreviewing(null)} title="Question preview">
        {previewing && (
          <div>
            <p className="text-sm font-medium text-ink-900">{previewing.text}</p>
            <div className="mt-3 space-y-2">
              {previewing.options.map((o) => (
                <div key={o.id} className={`rounded-lg border px-3 py-2 text-sm ${o.isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-ink-100 text-ink-600"}`}>
                  {o.text} {o.isCorrect && <span className="text-xs font-semibold">(Correct)</span>}
                </div>
              ))}
            </div>
            {previewing.explanation && <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">{previewing.explanation}</p>}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete question?"
        message="This question will be permanently removed from your question bank."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function QuestionEditorModal({
  open,
  onClose,
  editing,
  subjects,
  classes,
}: {
  open: boolean;
  onClose: () => void;
  editing: Question | null;
  subjects: { id: string; name: string }[];
  classes: { id: string; name: string }[];
}) {
  const [form, setForm] = useState<QuestionPayload>(emptyForm);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        subjectId: editing.subjectId,
        classId: editing.classId ?? "",
        topic: editing.topic,
        text: editing.text,
        type: editing.type,
        difficulty: editing.difficulty,
        marks: editing.marks,
        explanation: editing.explanation ?? "",
        options: editing.options.map((o) => ({ text: o.text, isCorrect: !!o.isCorrect })),
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, editing]);

  const mutation = useMutation({
    mutationFn: () => (editing ? updateQuestion(editing.id, form) : createQuestion(form)),
    onSuccess: () => {
      showToast(editing ? "Question updated" : "Question created", "success");
      queryClient.invalidateQueries({ queryKey: ["teacher", "questions"] });
      onClose();
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.options.filter((o) => o.text.trim()).length < 2) {
      showToast("Add at least two answer options", "error");
      return;
    }
    const correctCount = form.options.filter((o) => o.isCorrect).length;
    if (form.type === "SINGLE_CHOICE" && correctCount !== 1) {
      showToast("Mark exactly one option as correct", "error");
      return;
    }
    if (form.type === "MULTIPLE_SELECT" && (correctCount < 1 || correctCount >= form.options.length)) {
      showToast("Mark at least one correct option, and leave at least one option incorrect", "error");
      return;
    }
    mutation.mutate();
  }

  function updateOption(index: number, text: string) {
    setForm({ ...form, options: form.options.map((o, i) => (i === index ? { ...o, text } : o)) });
  }

  function setCorrect(index: number) {
    setForm({ ...form, options: form.options.map((o, i) => ({ ...o, isCorrect: i === index })) });
  }

  function toggleCorrect(index: number) {
    setForm({ ...form, options: form.options.map((o, i) => (i === index ? { ...o, isCorrect: !o.isCorrect } : o)) });
  }

  function changeType(type: QuestionType) {
    setForm({
      ...form,
      type,
      options: type === "SINGLE_CHOICE" ? form.options.map((o, i) => ({ ...o, isCorrect: i === form.options.findIndex((x) => x.isCorrect) })) : form.options,
    });
  }

  function addOption() {
    if (form.options.length >= 6) return;
    setForm({ ...form, options: [...form.options, { text: "", isCorrect: false }] });
  }

  function removeOption(index: number) {
    if (form.options.length <= 2) return;
    const wasCorrect = form.options[index].isCorrect;
    const next = form.options.filter((_, i) => i !== index);
    if (wasCorrect && next.length) next[0] = { ...next[0], isCorrect: true };
    setForm({ ...form, options: next });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit question" : "New question"}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" form="question-form" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save question"}
          </button>
        </>
      }
    >
      <form id="question-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Question text</label>
          <textarea required className="textarea" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Subject</label>
            <select required className="select" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Class</label>
            <select className="select" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              <option value="">Any class</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Topic</label>
            <input required className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Algebra" />
          </div>
          <div>
            <label className="label">Question type</label>
            <select className="select" value={form.type} onChange={(e) => changeType(e.target.value as QuestionType)}>
              <option value="SINGLE_CHOICE">Multiple choice (one answer)</option>
              <option value="MULTIPLE_SELECT">Multiple selection (several answers)</option>
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
            <label className="label">Marks</label>
            <input type="number" min={1} className="input" value={form.marks} onChange={(e) => setForm({ ...form, marks: Number(e.target.value) })} />
          </div>
        </div>

        <div>
          <label className="label">
            Answer options — {form.type === "MULTIPLE_SELECT" ? "check all correct answers" : "select the correct one"}
          </label>
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                {form.type === "MULTIPLE_SELECT" ? (
                  <input type="checkbox" checked={opt.isCorrect} onChange={() => toggleCorrect(i)} className="h-4 w-4 rounded text-brand-600" />
                ) : (
                  <input type="radio" name="correct-option" checked={opt.isCorrect} onChange={() => setCorrect(i)} className="h-4 w-4 text-brand-600" />
                )}
                <input
                  required
                  className="input"
                  value={opt.text}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                />
                <button type="button" onClick={() => removeOption(i)} className="btn-ghost btn-sm text-red-600" disabled={form.options.length <= 2}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {form.options.length < 6 && (
            <button type="button" onClick={addOption} className="btn-secondary btn-sm mt-2">
              <Plus className="h-4 w-4" /> Add option
            </button>
          )}
        </div>

        <div>
          <label className="label">Explanation (optional)</label>
          <textarea className="textarea" value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} placeholder="Shown to students after the quiz, if enabled." />
        </div>
      </form>
    </Modal>
  );
}
