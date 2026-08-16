import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import {
  assignTeacherToSubject,
  createSubject,
  deleteSubject,
  listClasses,
  listSubjects,
  listUsers,
  removeAssignment,
  updateSubject,
} from "../../api/admin";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Subject } from "../../types";

export default function SubjectsPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [assignOpen, setAssignOpen] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: "", code: "" });

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["admin", "subjects"], queryFn: listSubjects });

  const saveMutation = useMutation({
    mutationFn: () => (editing ? updateSubject(editing.id, form) : createSubject(form)),
    onSuccess: () => {
      showToast(editing ? "Subject updated" : "Subject created", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "subjects"] });
      setEditorOpen(false);
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => {
      showToast("Subject deleted", "success");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "subjects"] });
    },
    onError: (err) => {
      showToast(apiErrorMessage(err), "error");
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "" });
    setEditorOpen(true);
  }

  function openEdit(s: Subject) {
    setEditing(s);
    setForm({ name: s.name, code: s.code ?? "" });
    setEditorOpen(true);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Subjects</h1>
          <p className="mt-1 text-sm text-ink-500">Manage subjects and assign teachers to classes.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Subject
        </button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !data?.data.length ? (
        <EmptyState title="No subjects yet" action={<button className="btn-primary" onClick={openCreate}>Add Subject</button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.data.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-ink-900">{s.name}</h3>
                  <p className="text-xs text-ink-400">{s._count?.quizzes ?? 0} quizzes · {s._count?.questions ?? 0} questions</p>
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost btn-sm" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></button>
                  <button className="btn-ghost btn-sm text-red-600" onClick={() => setDeleteTarget(s)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="mt-4 border-t border-ink-100 pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Teacher assignments</p>
                  <button className="btn-secondary btn-sm" onClick={() => setAssignOpen(s)}>
                    <UserPlus className="h-3.5 w-3.5" /> Assign
                  </button>
                </div>
                {!s.assignments?.length ? (
                  <p className="text-xs text-ink-400">No teachers assigned yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {s.assignments.map((a) => (
                      <span key={a.id} className="badge-brand">
                        {a.teacher?.user?.name} · {a.class?.name}
                        <button
                          onClick={async () => {
                            await removeAssignment(a.id);
                            queryClient.invalidateQueries({ queryKey: ["admin", "subjects"] });
                          }}
                          className="ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? "Edit subject" : "Add subject"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditorOpen(false)}>Cancel</button>
            <button className="btn-primary" form="subject-form" type="submit" disabled={saveMutation.isPending}>Save</button>
          </>
        }
      >
        <form id="subject-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Subject name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" />
          </div>
          <div>
            <label className="label">Code (optional)</label>
            <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH" />
          </div>
        </form>
      </Modal>

      {assignOpen && <AssignTeacherModal subject={assignOpen} onClose={() => setAssignOpen(null)} />}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete subject?"
        message="This will permanently delete the subject. Quizzes and questions using it may be affected."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function AssignTeacherModal({ subject, onClose }: { subject: Subject; onClose: () => void }) {
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const teachersQuery = useQuery({ queryKey: ["admin", "users", "teachers-all"], queryFn: () => listUsers({ role: "TEACHER", pageSize: 100 }) });
  const classesQuery = useQuery({ queryKey: ["admin", "classes"], queryFn: listClasses });

  const mutation = useMutation({
    mutationFn: () => assignTeacherToSubject(subject.id, teacherId, classId),
    onSuccess: () => {
      showToast("Teacher assigned", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "subjects"] });
      onClose();
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`Assign a teacher to ${subject.name}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!teacherId || !classId || mutation.isPending} onClick={() => mutation.mutate()}>Assign</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Teacher</label>
          <select className="select" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">Select teacher</option>
            {teachersQuery.data?.data.map((t) => (
              <option key={t.teacherProfile?.id} value={t.teacherProfile?.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Class</label>
          <select className="select" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Select class</option>
            {classesQuery.data?.data.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
