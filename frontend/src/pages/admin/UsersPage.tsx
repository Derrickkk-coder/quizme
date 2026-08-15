import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Ban, CheckCircle2, KeyRound, Plus, Search } from "lucide-react";
import { createUser, CreateUserPayload, listClasses, listUsers, resetUserPassword, updateUser } from "../../api/admin";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { Pagination } from "../../components/ui/Pagination";
import { initials } from "../../utils/format";
import { Role, User } from "../../types";

export default function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = (searchParams.get("role") as Role | null) ?? "";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => setPage(1), [role, search]);

  const usersQuery = useQuery({
    queryKey: ["admin", "users", { page, role, search }],
    queryFn: () => listUsers({ page, pageSize: 10, role: role || undefined, search: search || undefined }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (u: User) => updateUser(u.id, { isActive: !u.isActive }),
    onSuccess: (_res, u) => {
      showToast(u.isActive ? "User deactivated" : "User activated", "success");
      setDeactivateTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => resetUserPassword(id),
    onSuccess: (res, id) => {
      const u = usersQuery.data?.data.find((x) => x.id === id);
      setTempPassword({ email: u?.email ?? "", password: res.tempPassword });
      setResetTarget(null);
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const title = role === "STUDENT" ? "Students" : role === "TEACHER" ? "Teachers" : "All Users";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          <p className="mt-1 text-sm text-ink-500">Manage user accounts and access.</p>
        </div>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Search by name, email, ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select w-auto" value={role} onChange={(e) => setSearchParams(e.target.value ? { role: e.target.value } : {})}>
          <option value="">All roles</option>
          <option value="STUDENT">Students</option>
          <option value="TEACHER">Teachers</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      {usersQuery.isLoading ? (
        <PageLoader />
      ) : !usersQuery.data?.data.length ? (
        <EmptyState title="No users found" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50">
                <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Class / ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.data.map((u) => (
                  <tr key={u.id} className="border-t border-ink-100 hover:bg-ink-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{initials(u.name)}</div>
                        <span className="font-medium text-ink-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="badge-gray capitalize">{u.role.toLowerCase()}</span></td>
                    <td className="px-4 py-3 text-ink-500">{u.email}</td>
                    <td className="px-4 py-3 text-ink-500">
                      {u.studentProfile ? `${u.studentProfile.class?.name ?? "—"} · ${u.studentProfile.studentCode}` : u.teacherProfile ? u.teacherProfile.staffCode : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.isActive ? "badge-green" : "badge-red"}>{u.isActive ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-ghost btn-sm" title="Reset password" onClick={() => setResetTarget(u)}>
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          className="btn-ghost btn-sm"
                          title={u.isActive ? "Deactivate" : "Activate"}
                          onClick={() => (u.isActive ? setDeactivateTarget(u) : toggleActiveMutation.mutate(u))}
                        >
                          {u.isActive ? <Ban className="h-4 w-4 text-red-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={usersQuery.data.meta} onPageChange={setPage} />
        </div>
      )}

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(email, password) => setTempPassword({ email, password })} />

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Deactivate user?"
        message={`${deactivateTarget?.name} will no longer be able to log in until reactivated.`}
        confirmLabel="Deactivate"
        danger
        loading={toggleActiveMutation.isPending}
        onConfirm={() => deactivateTarget && toggleActiveMutation.mutate(deactivateTarget)}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={!!resetTarget}
        title="Reset password?"
        message={`A new temporary password will be generated for ${resetTarget?.name}. They'll be required to change it on next login.`}
        confirmLabel="Reset Password"
        loading={resetPasswordMutation.isPending}
        onConfirm={() => resetTarget && resetPasswordMutation.mutate(resetTarget.id)}
        onCancel={() => setResetTarget(null)}
      />

      <Modal
        open={!!tempPassword}
        onClose={() => setTempPassword(null)}
        title="Temporary password generated"
        footer={<button className="btn-primary" onClick={() => setTempPassword(null)}>Done</button>}
      >
        <p className="text-sm text-ink-600">
          Share this password securely with <strong>{tempPassword?.email}</strong>. It will only be shown once, and must be changed on
          first login.
        </p>
        <div className="mt-4 rounded-lg bg-ink-100 px-4 py-3 text-center font-mono text-lg font-bold tracking-wide text-ink-900">
          {tempPassword?.password}
        </div>
      </Modal>
    </div>
  );
}

function CreateUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (email: string, password: string) => void }) {
  const [form, setForm] = useState<CreateUserPayload>({ name: "", email: "", role: "STUDENT", classId: "" });
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const classesQuery = useQuery({ queryKey: ["admin", "classes"], queryFn: listClasses, enabled: open });

  const mutation = useMutation({
    mutationFn: () => createUser(form),
    onSuccess: (res) => {
      showToast("User created", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onCreated(res.user.email, res.tempPassword);
      setForm({ name: "", email: "", role: "STUDENT", classId: "" });
      onClose();
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add new user"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" form="create-user-form" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create User"}
          </button>
        </>
      }
    >
      <form id="create-user-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Role</label>
          <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="STUDENT">Student</option>
            <option value="TEACHER">Teacher</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className="label">Full name</label>
          <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">Email</label>
          <input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        {form.role === "STUDENT" && (
          <div>
            <label className="label">Class</label>
            <select required className="select" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
              <option value="">Select class</option>
              {classesQuery.data?.data.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        <p className="text-xs text-ink-400">A temporary password will be generated automatically and shown once after creation.</p>
      </form>
    </Modal>
  );
}
