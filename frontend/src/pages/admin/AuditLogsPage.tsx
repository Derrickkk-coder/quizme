import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { listAuditLogs } from "../../api/admin";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { formatDateTime } from "../../utils/format";

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-logs", { page, action }],
    queryFn: () => listAuditLogs({ page, pageSize: 20, action: action || undefined }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Audit Logs</h1>
        <p className="mt-1 text-sm text-ink-500">A record of important actions taken across the platform.</p>
      </div>

      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input className="input pl-9" placeholder="Filter by action (e.g. QUIZ_CREATED)…" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !data?.data.length ? (
        <EmptyState title="No audit records found" />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50">
                <tr className="text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">IP address</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((log) => (
                  <tr key={log.id} className="border-t border-ink-100 hover:bg-ink-50/60">
                    <td className="px-4 py-3"><span className="badge-brand font-mono text-[11px]">{log.action}</span></td>
                    <td className="px-4 py-3 text-ink-600">{log.actor?.name ?? "System"}</td>
                    <td className="px-4 py-3 text-ink-500">{log.entityType ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-400">{log.ipAddress ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-400">{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
