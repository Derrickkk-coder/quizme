import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Users, BookOpenCheck } from "lucide-react";
import { createClass, deleteClass, listClasses, updateClass } from "../../api/admin";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { SchoolClass } from "../../types";

export default function ClassesPage() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchoolClass | null>(null);
  const [form, setForm] = useState({ name: "", level: "" });

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["admin", "classes"], queryFn: listClasses });

  const saveMutation = useMutation({
    mutationFn: () => (editing ? updateClass(editing.id, form) : createClass(form)),
    onSuccess: () => {
      showToast(editing ? "Class updated" : "Class created", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "classes"] });
      setEditorOpen(false);
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteClass(id),
    onSuccess: () => {
      showToast("Class deleted", "success");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "classes"] });
    },
    onError: (err) => {
      showToast(apiErrorMessage(err), "error");
      setDeleteTarget(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", level: "" });
    setEditorOpen(true);
  }

  function openEdit(c: SchoolClass) {
    setEditing(c);
    setForm({ name: c.name, level: c.level ?? "" });
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
          <h1 className="text-2xl font-bold text-ink-900">Classes</h1>
          <p className="mt-1 text-sm text-ink-500">Manage the classes in your school.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Class
        </button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !data?.data.length ? (
        <EmptyState title="No classes yet" action={<button className="btn-primary" onClick={openCreate}>Add Class</button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.data.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-ink-900">{c.name}</h3>
                  {c.level && <p className="text-xs text-ink-400">{c.level}</p>}
                </div>
                <div className="flex gap-1">
                  <button className="btn-ghost btn-sm" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button className="btn-ghost btn-sm text-red-600" onClick={() => setDeleteTarget(c)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex gap-4 text-xs text-ink-500">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c._count?.students ?? 0} students</span>
                <span className="flex items-center gap-1"><BookOpenCheck className="h-3.5 w-3.5" /> {c._count?.quizzes ?? 0} quizzes</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? "Edit class" : "Add class"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditorOpen(false)}>Cancel</button>
            <button className="btn-primary" form="class-form" type="submit" disabled={saveMutation.isPending}>Save</button>
          </>
        }
      >
        <form id="class-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Class name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. JHS 2A" />
          </div>
          <div>
            <label className="label">Level (optional)</label>
            <input className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="e.g. JHS2" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete class?"
        message="Classes with students assigned can't be deleted. Reassign students first."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
