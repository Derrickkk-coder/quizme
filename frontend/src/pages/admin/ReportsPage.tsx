import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Users as UsersIcon } from "lucide-react";
import { downloadResultsCsv, downloadUsersCsv, listClasses, listSubjects } from "../../api/admin";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { SectionCard } from "../../components/ui/SectionCard";

export default function ReportsPage() {
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState<"results" | "users" | null>(null);
  const { showToast } = useToast();

  const classesQuery = useQuery({ queryKey: ["admin", "classes"], queryFn: listClasses });
  const subjectsQuery = useQuery({ queryKey: ["admin", "subjects"], queryFn: listSubjects });

  async function handleResultsExport() {
    setLoading("results");
    try {
      await downloadResultsCsv({ classId: classId || undefined, subjectId: subjectId || undefined });
      showToast("Report downloaded", "success");
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setLoading(null);
    }
  }

  async function handleUsersExport() {
    setLoading("users");
    try {
      await downloadUsersCsv();
      showToast("Report downloaded", "success");
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Reports</h1>
        <p className="mt-1 text-sm text-ink-500">Generate and export school-wide reports.</p>
      </div>

      <SectionCard title="Results report">
        <p className="mb-4 text-sm text-ink-500">Export every submitted quiz result across the school, optionally filtered by class or subject.</p>
        <div className="flex flex-wrap gap-3">
          <select className="select w-auto" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">All classes</option>
            {classesQuery.data?.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select w-auto" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">All subjects</option>
            {subjectsQuery.data?.data.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button className="btn-primary" onClick={handleResultsExport} disabled={loading === "results"}>
            <FileSpreadsheet className="h-4 w-4" /> {loading === "results" ? "Exporting…" : "Export Results CSV"}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Users report">
        <p className="mb-4 text-sm text-ink-500">Export the full list of students, teachers, and admins with their status.</p>
        <button className="btn-primary" onClick={handleUsersExport} disabled={loading === "users"}>
          <UsersIcon className="h-4 w-4" /> {loading === "users" ? "Exporting…" : "Export Users CSV"}
        </button>
      </SectionCard>

      <SectionCard title="More reports">
        <div className="flex items-start gap-3 rounded-lg bg-ink-50 p-4 text-sm text-ink-500">
          <Download className="mt-0.5 h-4 w-4 shrink-0" />
          Class, subject, and quiz-specific performance can also be exported directly from a quiz's Analytics page.
        </div>
      </SectionCard>
    </div>
  );
}
