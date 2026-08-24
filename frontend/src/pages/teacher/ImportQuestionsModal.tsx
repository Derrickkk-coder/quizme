import { ChangeEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { bulkImportQuestions, BulkImportRow } from "../../api/teacher";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Modal } from "../../components/ui/Modal";
import { Difficulty, QuestionType } from "../../types";

interface ImportQuestionsModalProps {
  open: boolean;
  onClose: () => void;
  subjects: { id: string; name: string }[];
  classes: { id: string; name: string }[];
}

interface ParsedRow {
  rowNumber: number;
  data: BulkImportRow | null;
  error: string | null;
  raw: Record<string, string>;
}

const TEMPLATE_HEADER = ["Topic", "Question", "Type", "Difficulty", "Marks", "Option1", "Option2", "Option3", "Option4", "Option5", "Option6", "CorrectOptions", "Explanation"];
const TEMPLATE_EXAMPLE = [
  "Algebra",
  "What is the value of x in 2x + 4 = 10?",
  "Single",
  "Medium",
  "1",
  "2",
  "3",
  "4",
  "",
  "",
  "",
  "2",
  "Subtract 4 from both sides, then divide by 2.",
];

function normalizeType(raw: string): QuestionType {
  const v = raw.trim().toLowerCase();
  if (v.startsWith("multi")) return "MULTIPLE_SELECT";
  return "SINGLE_CHOICE";
}

function normalizeDifficulty(raw: string): Difficulty {
  const v = raw.trim().toLowerCase();
  if (v.startsWith("easy")) return "EASY";
  if (v.startsWith("hard")) return "HARD";
  return "MEDIUM";
}

function parseRow(raw: Record<string, string>, rowNumber: number): ParsedRow {
  const topic = (raw.Topic ?? "").trim();
  const text = (raw.Question ?? "").trim();
  const type = normalizeType(raw.Type ?? "");
  const difficulty = normalizeDifficulty(raw.Difficulty ?? "");
  const marksRaw = (raw.Marks ?? "").trim();
  const marks = marksRaw ? parseInt(marksRaw, 10) : 1;
  const explanation = (raw.Explanation ?? "").trim();

  const options = [1, 2, 3, 4, 5, 6]
    .map((i) => (raw[`Option${i}`] ?? "").trim())
    .filter((t) => t.length > 0)
    .map((t) => ({ text: t, isCorrect: false }));

  const correctIndexes = (raw.CorrectOptions ?? "")
    .split(/[,;]/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));

  for (const idx of correctIndexes) {
    if (options[idx - 1]) options[idx - 1].isCorrect = true;
  }

  if (!topic) return { rowNumber, data: null, error: "Missing topic", raw };
  if (!text || text.length < 3) return { rowNumber, data: null, error: "Question text is missing or too short", raw };
  if (options.length < 2) return { rowNumber, data: null, error: "Needs at least 2 answer options", raw };
  if (Number.isNaN(marks) || marks < 1) return { rowNumber, data: null, error: "Marks must be a positive number", raw };

  const correctCount = options.filter((o) => o.isCorrect).length;
  if (type === "SINGLE_CHOICE" && correctCount !== 1) {
    return { rowNumber, data: null, error: "Single-choice questions need exactly one correct option in CorrectOptions", raw };
  }
  if (type === "MULTIPLE_SELECT" && (correctCount < 1 || correctCount >= options.length)) {
    return { rowNumber, data: null, error: "Multi-select questions need at least one correct and one incorrect option", raw };
  }

  return {
    rowNumber,
    data: { topic, text, type, difficulty, marks, explanation: explanation || undefined, options },
    error: null,
    raw,
  };
}

function downloadTemplate() {
  const csv = Papa.unparse([TEMPLATE_HEADER, TEMPLATE_EXAMPLE]);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "question_import_template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ImportQuestionsModal({ open, onClose, subjects, classes }: ImportQuestionsModalProps) {
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  function reset() {
    setSubjectId("");
    setClassId("");
    setRows(null);
    setFileName("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map((raw, i) => parseRow(raw, i + 2));
        setRows(parsed);
      },
      error: (err) => showToast(`Could not read file: ${err.message}`, "error"),
    });
  }

  const validRows = rows?.filter((r) => r.data) ?? [];
  const invalidRows = rows?.filter((r) => !r.data) ?? [];

  const importMutation = useMutation({
    mutationFn: () =>
      bulkImportQuestions({
        subjectId,
        classId: classId || undefined,
        questions: validRows.map((r) => r.data!),
      }),
    onSuccess: ({ data }) => {
      if (data.createdCount > 0) {
        showToast(`${data.createdCount} question${data.createdCount === 1 ? "" : "s"} imported`, "success");
      }
      if (data.errors.length > 0) {
        showToast(`${data.errors.length} question${data.errors.length === 1 ? "" : "s"} failed on the server — see console for details`, "error");
        console.warn("Bulk import row errors:", data.errors);
      }
      queryClient.invalidateQueries({ queryKey: ["teacher", "questions"] });
      handleClose();
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  function handleImport() {
    if (!subjectId) {
      showToast("Select a subject first", "error");
      return;
    }
    if (validRows.length === 0) {
      showToast("No valid questions to import", "error");
      return;
    }
    importMutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Import questions from CSV"
      size="xl"
      footer={
        rows ? (
          <>
            <button className="btn-secondary" onClick={() => setRows(null)}>
              Back
            </button>
            <button className="btn-primary" onClick={handleImport} disabled={!validRows.length || importMutation.isPending}>
              {importMutation.isPending ? "Importing…" : `Import ${validRows.length} question${validRows.length === 1 ? "" : "s"}`}
            </button>
          </>
        ) : (
          <button className="btn-secondary" onClick={handleClose}>
            Cancel
          </button>
        )
      }
    >
      {!rows ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Subject</label>
              <select required className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">Select subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Class (optional)</label>
              <select className="select" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Any class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-ink-200 p-6 text-center">
            <FileSpreadsheet className="mx-auto h-8 w-8 text-ink-300" />
            <p className="mt-2 text-sm text-ink-600">Upload a CSV file of questions to add to your bank.</p>
            <label className="btn-primary btn-sm mt-3 inline-flex cursor-pointer">
              <Upload className="h-4 w-4" /> Choose CSV file
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </label>
          </div>

          <button type="button" onClick={downloadTemplate} className="flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
            <Download className="h-3.5 w-3.5" /> Download CSV template
          </button>

          <div className="rounded-lg bg-ink-50 px-4 py-3 text-xs text-ink-500">
            <p className="font-semibold text-ink-600">Columns: Topic, Question, Type, Difficulty, Marks, Option1–6, CorrectOptions, Explanation</p>
            <p className="mt-1">Type is "Single" or "Multi". CorrectOptions lists the 1-based option numbers that are correct, separated by "," or ";" (e.g. "2" or "1;3").</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-ink-600">
              <span className="font-medium">{fileName}</span> — {rows.length} row{rows.length === 1 ? "" : "s"} found
            </p>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> {validRows.length} ready
              </span>
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" /> {invalidRows.length} skipped
                </span>
              )}
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto rounded-xl border border-ink-100">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-ink-50 text-ink-400">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Question</th>
                  <th className="px-3 py-2">Options</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((r) => (
                  <tr key={r.rowNumber} className={r.error ? "bg-red-50/50" : undefined}>
                    <td className="px-3 py-2 text-ink-400">{r.rowNumber}</td>
                    <td className="max-w-[280px] truncate px-3 py-2 text-ink-700">{r.raw.Question || <span className="italic text-ink-300">blank</span>}</td>
                    <td className="px-3 py-2 text-ink-500">{r.data ? `${r.data.options.length} options` : "—"}</td>
                    <td className="px-3 py-2">
                      {r.error ? (
                        <span className="text-red-600">{r.error}</span>
                      ) : (
                        <span className="text-emerald-600">Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
