import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../../api/notifications";
import { PageLoader } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Pagination } from "../../components/ui/Pagination";
import { timeAgo } from "../../utils/format";

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["notifications", "list", page], queryFn: () => listNotifications(page, 15) });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Notifications</h1>
          <p className="mt-1 text-sm text-ink-500">{data?.unreadCount ?? 0} unread</p>
        </div>
        <button className="btn-secondary" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : !data?.data.length ? (
        <EmptyState title="No notifications" description="You're all caught up." />
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-ink-100">
            {data.data.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.isRead && markReadMutation.mutate(n.id)}
                className={`flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-ink-50 ${!n.isRead ? "bg-brand-50/40" : ""}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-ink-200" : "bg-brand-500"}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-800">{n.title}</p>
                  <p className="mt-0.5 text-sm text-ink-500">{n.message}</p>
                  <p className="mt-1 text-xs text-ink-400">{timeAgo(n.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
