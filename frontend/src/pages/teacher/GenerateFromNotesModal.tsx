import { ChangeEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Trash2, Upload } from "lucide-react";
import { generateQuestionsFromNotes, GeneratedQuestion, saveGeneratedQuestions } from "../../api/teacher";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Modal } from "../../components/ui/Modal";
import { Difficulty, QuestionType } from "../../types";

interface GenerateFromNotesModalProps {
  open: boolean;
  onClose: () => void;
  subjects: { id: string; name: string }[];
  classes: { id: string; name: string }[];
}

const initialSettings = {
  notes: "",
  topic: "",
  subjectId: "",
  classId: "",
  count: 5,
  difficulty: "MEDIUM" as Difficulty | "MIXED",
  questionType: "SINGLE_CHOICE" as QuestionType | "MIXED",
};

export function GenerateFromNotesModal({ open, onClose, subjects, classes }: GenerateFromNotesModalProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [questions, setQuestions] = useState<GeneratedQuestion[] | null>(null);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  function reset() {
    setSettings(initialSettings);
    setQuestions(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      showToast("Please upload a plain .txt file", "error");
      return;
    }
    const text = await file.text();
    setSettings((s) => ({ ...s, notes: s.notes ? `${s.notes}\n\n${text}` : text }));
  }

  const generateMutation = useMutation({
    mutationFn: () =>
      generateQuestionsFromNotes({
        notes: settings.notes,
        count: settings.count,
        difficulty: settings.difficulty,
        questionType: settings.questionType,
        topic: settings.topic || undefined,
      }),
    onSuccess: (res) => {
      setQuestions(res.data);
      showToast(`Generated ${res.data.length} question${res.data.length === 1 ? "" : "s"}. Review before saving.`, "success");
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      saveGeneratedQuestions({
        subjectId: settings.subjectId,
        classId: settings.classId || undefined,
        topic: settings.topic,
        questions: questions ?? [],
      }),
    onSuccess: (res) => {
      showToast(`Saved ${res.data.length} question${res.data.length === 1 ? "" : "s"} to your question bank`, "success");
      queryClient.invalidateQueries({ queryKey: ["teacher", "questions"] });
      handleClose();
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  function handleGenerate() {
    if (settings.notes.trim().length < 20) {
      showToast("Add more detail to your notes before generating questions", "error");
      return;
    }
    if (!settings.subjectId) {
      showToast("Select a subject first", "error");
      return;
    }
    if (!settings.topic.trim()) {
      showToast("Enter a topic for these questions", "error");
      return;
    }
    generateMutation.mutate();
  }

  function handleSave() {
    if (!questions?.length) return;
    for (const q of questions) {
      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (q.type === "SINGLE_CHOICE" && correctCount !== 1) {
        showToast("Every multiple choice question needs exactly one correct option", "error");
        return;
      }
      if (q.type === "MULTIPLE_SELECT" && (correctCount < 1 || correctCount >= q.options.length)) {
        showToast("Every multiple selection question needs at least one correct and one incorrect option", "error");
        return;
      }
    }
    saveMutation.mutate();
  }

  function updateQuestionText(index: number, text: string) {
    setQuestions((prev) => prev && prev.map((q, i) => (i === index ? { ...q, text } : q)));
  }

  function updateOptionText(qIndex: number, oIndex: number, text: string) {
    setQuestions(
      (prev) =>
        prev &&
        prev.map((q, i) => (i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? { ...o, text } : o)) } : q))
    );
  }

  function setCorrect(qIndex: number, oIndex: number) {
    setQuestions(
      (prev) =>
        prev &&
        prev.map((q, i) => (i === qIndex ? { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oIndex })) } : q))
    );
  }

  function toggleCorrect(qIndex: number, oIndex: number) {
    setQuestions(
      (prev) =>
        prev &&
        prev.map((q, i) =>
          i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? { ...o, isCorrect: !o.isCorrect } : o)) } : q
        )
    );
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev && prev.filter((_, i) => i !== index));
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Generate questions from notes"
      size="xl"
      footer={
        questions ? (
          <>
            <button className="btn-secondary" onClick={() => setQuestions(null)}>
              Back
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={!questions.length || saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : `Save ${questions.length} question${questions.length === 1 ? "" : "s"} to bank`}
            </button>
          </>
        ) : (
          <>
            <button className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleGenerate} disabled={generateMutation.isPending}>
              <Sparkles className="h-4 w-4" /> {generateMutation.isPending ? "Generating…" : "Generate questions"}
            </button>
          </>
        )
      }
    >
      {!questions ? (
        <div className="space-y-4">
          <div>
            <label className="label">Paste your notes</label>
            <textarea
              className="textarea min-h-[180px]"
              placeholder="Paste the notes, textbook excerpt, or lesson content you want quiz questions generated from…"
              value={settings.notes}
              onChange={(e) => setSettings({ ...settings, notes: e.target.value })}
            />
            <label className="btn-secondary btn-sm mt-2 inline-flex cursor-pointer">
              <Upload className="h-4 w-4" /> Upload .txt file
              <input type="file" accept=".txt,text/plain" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Subject</label>
              <select required className="select" value={settings.subjectId} onChange={(e) => setSettings({ ...settings, subjectId: e.target.value })}>
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Class (optional)</label>
              <select className="select" value={settings.classId} onChange={(e) => setSettings({ ...settings, classId: e.target.value })}>
                <option value="">Any class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Topic</label>
              <input required className="input" value={settings.topic} onChange={(e) => setSettings({ ...settings, topic: e.target.value })} placeholder="e.g. Photosynthesis" />
            </div>
            <div>
              <label className="label">Number of questions</label>
              <input
                type="number"
                min={1}
                max={20}
                className="input"
                value={settings.count}
                onChange={(e) => setSettings({ ...settings, count: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="select" value={settings.difficulty} onChange={(e) => setSettings({ ...settings, difficulty: e.target.value as Difficulty | "MIXED" })}>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>
            <div>
              <label className="label">Question type</label>
              <select className="select" value={settings.questionType} onChange={(e) => setSettings({ ...settings, questionType: e.target.value as QuestionType | "MIXED" })}>
                <option value="SINGLE_CHOICE">Multiple choice (one answer)</option>
                <option value="MULTIPLE_SELECT">Multiple selection (several answers)</option>
                <option value="MIXED">Mixed</option>
              </select>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-500">Review and edit the generated questions below, then save them to your question bank.</p>
          {questions.length === 0 ? (
            <p className="rounded-lg bg-ink-50 px-4 py-6 text-center text-sm text-ink-500">All questions were removed. Go back to generate again.</p>
          ) : (
            questions.map((q, qi) => (
              <div key={qi} className="rounded-xl border border-ink-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <textarea
                    className="textarea flex-1"
                    value={q.text}
                    onChange={(e) => updateQuestionText(qi, e.target.value)}
                  />
                  <button type="button" className="btn-ghost btn-sm text-red-600" onClick={() => removeQuestion(qi)} title="Remove question">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span className="badge-gray">{q.difficulty}</span>
                  {q.type === "MULTIPLE_SELECT" && <span className="badge-brand">Multi-select</span>}
                </div>
                <div className="mt-3 space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      {q.type === "MULTIPLE_SELECT" ? (
                        <input type="checkbox" checked={opt.isCorrect} onChange={() => toggleCorrect(qi, oi)} className="h-4 w-4 rounded text-brand-600" />
                      ) : (
                        <input type="radio" name={`correct-${qi}`} checked={opt.isCorrect} onChange={() => setCorrect(qi, oi)} className="h-4 w-4 text-brand-600" />
                      )}
                      <input className="input" value={opt.text} onChange={(e) => updateOptionText(qi, oi, e.target.value)} />
                    </div>
                  ))}
                </div>
                {q.explanation && <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">{q.explanation}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}
