import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { BarChart3, Search } from "lucide-react";
import { getTeacherClasses, getTeacherStudents } from "../../api/teacher";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { initials } from "../../utils/format";

export default function StudentsPage() {
  const [classId, setClassId] = useState("");
  const [search, setSearch] = useState("");

  const classesQuery = useQuery({ queryKey: ["teacher", "classes"], queryFn: getTeacherClasses });
  const studentsQuery = useQuery({ queryKey: ["teacher", "students", classId], queryFn: () => getTeacherStudents(classId || undefined) });

  const filtered = (studentsQuery.data?.data ?? []).filter((s) => s.user.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Students</h1>
        <p className="mt-1 text-sm text-ink-500">Students in the classes you teach.</p>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select w-auto" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All my classes</option>
          {classesQuery.data?.data.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {studentsQuery.isLoading ? (
        <PageLoader />
      ) : !filtered.length ? (
        <EmptyState title="No students found" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="card flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {initials(s.user.name)}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink-800">{s.user.name}</p>
                  <p className="text-xs text-ink-400">{s.studentCode} · {s.class?.name}</p>
                </div>
              </div>
              <Link to={`/app/teacher/analytics/student/${s.id}`} className="btn-ghost btn-sm" title="View performance">
                <BarChart3 className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
