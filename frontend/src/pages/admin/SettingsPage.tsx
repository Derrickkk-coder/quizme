import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Star, Trash2 } from "lucide-react";
import {
  createAcademicYear,
  createTerm,
  deleteAcademicYear,
  deleteTerm,
  getGradeBands,
  listAcademicYears,
  saveGradeBands,
  updateAcademicYear,
  updateTerm,
} from "../../api/admin";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { PageLoader } from "../../components/ui/Spinner";
import { SectionCard } from "../../components/ui/SectionCard";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { AcademicYear, GradeBand, Term } from "../../types";
import { formatDate } from "../../utils/format";

export default function SettingsPage() {
  const [bands, setBands] = useState<GradeBand[]>([]);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["admin", "grade-bands"], queryFn: getGradeBands });

  useEffect(() => {
    if (data) setBands(data.data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => saveGradeBands(bands),
    onSuccess: (res) => {
      showToast("Grading scale updated", "success");
      setBands(res.data);
      queryClient.invalidateQueries({ queryKey: ["admin", "grade-bands"] });
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  function updateBand(index: number, field: keyof GradeBand, value: string | number) {
    setBands((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }

  function addBand() {
    setBands((prev) => [...prev, { grade: "", minPercent: 0, maxPercent: 0, label: "" }]);
  }

  function removeBand(index: number) {
    setBands((prev) => prev.filter((_, i) => i !== index));
  }

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Settings</h1>
        <p className="mt-1 text-sm text-ink-500">Configure school-wide platform settings.</p>
      </div>

      <SectionCard
        title="Grading scale"
        action={
          <button className="btn-primary btn-sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-3.5 w-3.5" /> {saveMutation.isPending ? "Saving…" : "Save changes"}
          </button>
        }
      >
        <p className="mb-4 text-sm text-ink-500">Define how percentage scores map to letter grades across the platform.</p>
        <div className="overflow-x-auto">
          <div className="min-w-[480px] space-y-2">
            <div className="grid grid-cols-[80px_1fr_1fr_2fr_40px] gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
              <span>Grade</span>
              <span>Min %</span>
              <span>Max %</span>
              <span>Label</span>
              <span></span>
            </div>
            {bands.map((band, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr_1fr_2fr_40px] items-center gap-2">
                <input className="input" value={band.grade} onChange={(e) => updateBand(i, "grade", e.target.value)} />
                <input type="number" className="input" value={band.minPercent} onChange={(e) => updateBand(i, "minPercent", Number(e.target.value))} />
                <input type="number" className="input" value={band.maxPercent} onChange={(e) => updateBand(i, "maxPercent", Number(e.target.value))} />
                <input className="input" value={band.label ?? ""} onChange={(e) => updateBand(i, "label", e.target.value)} />
                <button className="btn-ghost btn-sm text-red-600" onClick={() => removeBand(i)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <button className="btn-secondary btn-sm mt-3" onClick={addBand}>
          <Plus className="h-4 w-4" /> Add grade band
        </button>
      </SectionCard>

      <AcademicYearsSection />
    </div>
  );
}

function AcademicYearsSection() {
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [termModalYear, setTermModalYear] = useState<AcademicYear | null>(null);
  const [deleteYearTarget, setDeleteYearTarget] = useState<AcademicYear | null>(null);
  const [deleteTermTarget, setDeleteTermTarget] = useState<Term | null>(null);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["admin", "academic-years"], queryFn: listAcademicYears });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "academic-years"] });
  }

  const setCurrentYearMutation = useMutation({
    mutationFn: (id: string) => updateAcademicYear(id, { isCurrent: true }),
    onSuccess: () => {
      showToast("Current academic year updated", "success");
      invalidate();
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const setCurrentTermMutation = useMutation({
    mutationFn: (id: string) => updateTerm(id, { isCurrent: true }),
    onSuccess: () => {
      showToast("Current term updated", "success");
      invalidate();
    },
    onError: (err) => showToast(apiErrorMessage(err), "error"),
  });

  const deleteYearMutation = useMutation({
    mutationFn: (id: string) => deleteAcademicYear(id),
    onSuccess: () => {
      showToast("Academic year deleted", "success");
      setDeleteYearTarget(null);
      invalidate();
    },
    onError: (err) => {
      showToast(apiErrorMessage(err), "error");
      setDeleteYearTarget(null);
    },
  });

  const deleteTermMutation = useMutation({
    mutationFn: (id: string) => deleteTerm(id),
    onSuccess: () => {
      showToast("Term deleted", "success");
      setDeleteTermTarget(null);
      invalidate();
    },
    onError: (err) => {
      showToast(apiErrorMessage(err), "error");
      setDeleteTermTarget(null);
    },
  });

  return (
    <SectionCard
      title="Academic years & terms"
      action={
        <button className="btn-primary btn-sm" onClick={() => setYearModalOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add year
        </button>
      }
    >
      <p className="mb-4 -mt-2 text-sm text-ink-500">
        Organize quizzes by school year and term. Mark one year and one term as "current" — teachers can tag new quizzes with a term.
      </p>

      {isLoading ? (
        <PageLoader />
      ) : !data?.data.length ? (
        <EmptyState title="No academic years yet" description="Add your first academic year to start organizing quizzes by term." />
      ) : (
        <div className="space-y-4">
          {data.data.map((year) => (
            <div key={year.id} className="rounded-xl border border-ink-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink-900">{year.name}</p>
                  {year.isCurrent ? (
                    <span className="badge-brand">Current</span>
                  ) : (
                    <button
                      className="text-xs font-medium text-ink-400 hover:text-brand-600"
                      onClick={() => setCurrentYearMutation.mutate(year.id)}
                      disabled={setCurrentYearMutation.isPending}
                    >
                      Set current
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-400">
                    {formatDate(year.startDate)} – {formatDate(year.endDate)}
                  </span>
                  <button className="btn-ghost btn-sm text-red-600" onClick={() => setDeleteYearTarget(year)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {!year.terms.length ? (
                  <p className="text-xs text-ink-400">No terms yet.</p>
                ) : (
                  year.terms.map((term) => (
                    <div key={term.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink-700">{term.name}</p>
                        {term.isCurrent ? (
                          <span className="badge-green">
                            <Star className="h-3 w-3" /> Current
                          </span>
                        ) : (
                          <button
                            className="text-xs font-medium text-ink-400 hover:text-brand-600"
                            onClick={() => setCurrentTermMutation.mutate(term.id)}
                            disabled={setCurrentTermMutation.isPending}
                          >
                            Set current
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-ink-400">
                          {formatDate(term.startDate)} – {formatDate(term.endDate)}
                        </span>
                        <button className="btn-ghost btn-sm text-red-600" onClick={() => setDeleteTermTarget(term)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <button className="btn-secondary btn-sm mt-3" onClick={() => setTermModalYear(year)}>
                <Plus className="h-3.5 w-3.5" /> Add term
              </button>
            </div>
          ))}
        </div>
      )}

      <AddYearModal open={yearModalOpen} onClose={() => setYearModalOpen(false)} />
      <AddTermModal year={termModalYear} onClose={() => setTermModalYear(null)} />

      <ConfirmDialog
        open={!!deleteYearTarget}
        title="Delete academic year?"
        message={`"${deleteYearTarget?.name}" and all of its terms will be permanently deleted. Quizzes already tagged with these terms will keep their history but lose the term label.`}
        confirmLabel="Delete"
        danger
        loading={deleteYearMutation.isPending}
        onConfirm={() => deleteYearTarget && deleteYearMutation.mutate(deleteYearTarget.id)}
        onCancel={() => setDeleteYearTarget(null)}
      />

      <ConfirmDialog
        open={!!deleteTermTarget}
        title="Delete term?"
        message={`"${deleteTermTarget?.name}" will be permanently deleted. Quizzes already tagged with it will keep their history but lose the term label.`}
        confirmLabel="Delete"
        danger
        loading={deleteTermMutation.isPending}
        onConfirm={() => deleteTermTarget && deleteTermMutation.mutate(deleteTermTarget.id)}
        onCancel={() => setDeleteTermTarget(null)}
      />
    </SectionCard>
  );
}

function AddYearModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const emptyForm = { name: "", startDate: "", endDate: "", isCurrent: false };
  const [form, setForm] = useState(emptyForm);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setForm(emptyForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => createAcademicYear(form),
    onSuccess: () => {
      showToast("Academic year added", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "academic-years"] });
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
      title="Add academic year"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" form="year-form" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Add year"}
          </button>
        </>
      }
    >
      <form id="year-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input required className="input" placeholder="e.g. 2025/2026" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Start date</label>
            <input required type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div>
            <label className="label">End date</label>
            <input required type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600" />
          <span className="text-sm text-ink-700">Set as the current academic year</span>
        </label>
      </form>
    </Modal>
  );
}

function AddTermModal({ year, onClose }: { year: AcademicYear | null; onClose: () => void }) {
  const emptyForm = { name: "", startDate: "", endDate: "", isCurrent: false };
  const [form, setForm] = useState(emptyForm);
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (year) setForm(emptyForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const mutation = useMutation({
    mutationFn: () => createTerm({ ...form, academicYearId: year!.id }),
    onSuccess: () => {
      showToast("Term added", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "academic-years"] });
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
      open={!!year}
      onClose={onClose}
      title={`Add term to ${year?.name ?? ""}`}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" form="term-form" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Add term"}
          </button>
        </>
      }
    >
      <form id="term-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Name</label>
          <input required className="input" placeholder="e.g. Term 1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Start date</label>
            <input required type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div>
            <label className="label">End date</label>
            <input required type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} className="h-4 w-4 rounded border-ink-300 text-brand-600" />
          <span className="text-sm text-ink-700">Set as the current term</span>
        </label>
      </form>
    </Modal>
  );
}
