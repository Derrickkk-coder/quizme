import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { getGradeBands, saveGradeBands } from "../../api/admin";
import { apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { PageLoader } from "../../components/ui/Spinner";
import { SectionCard } from "../../components/ui/SectionCard";
import { GradeBand } from "../../types";

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
    </div>
  );
}
