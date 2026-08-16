import { FormEvent, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { changePassword } from "../../api/auth";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { SectionCard } from "../../components/ui/SectionCard";
import { initials } from "../../utils/format";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      showToast("Password updated successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await refreshUser();
    } catch (err) {
      showToast(apiErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Profile</h1>
        <p className="mt-1 text-sm text-ink-500">Your account details and security settings.</p>
      </div>

      <SectionCard>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">{initials(user.name)}</div>
          <div>
            <p className="text-lg font-semibold text-ink-900">{user.name}</p>
            <p className="text-sm text-ink-500">{user.email}</p>
            <span className="badge-brand mt-1 capitalize">{user.role.toLowerCase()}</span>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-ink-100 pt-4 text-sm">
          {user.studentProfile && (
            <>
              <div>
                <dt className="text-ink-400">Student ID</dt>
                <dd className="font-medium text-ink-700">{user.studentProfile.studentCode}</dd>
              </div>
              <div>
                <dt className="text-ink-400">Class</dt>
                <dd className="font-medium text-ink-700">{user.studentProfile.class?.name ?? "—"}</dd>
              </div>
            </>
          )}
          {user.teacherProfile && (
            <>
              <div>
                <dt className="text-ink-400">Staff ID</dt>
                <dd className="font-medium text-ink-700">{user.teacherProfile.staffCode}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-ink-400">Teaching assignments</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {user.teacherProfile.assignments?.length ? (
                    user.teacherProfile.assignments.map((a) => (
                      <span key={a.id} className="badge-gray">
                        {a.subject?.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-ink-400">No assignments yet</span>
                  )}
                </dd>
              </div>
            </>
          )}
        </dl>
      </SectionCard>

      <SectionCard title="Change password">
        {user.mustResetPassword && (
          <div className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            You're using a temporary password. Please set a new password to continue.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input required type="password" className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">New password</label>
            <input required minLength={8} type="password" className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input required minLength={8} type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
