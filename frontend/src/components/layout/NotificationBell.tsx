import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../../api/notifications";
import { timeAgo } from "../../utils/format";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ["notifications", "bell"],
    queryFn: () => listNotifications(1, 6),
    refetchInterval: 30000,
  });

  const basePath = user?.role === "ADMIN" ? "/app/admin/notifications" : user?.role === "TEACHER" ? "/app/teacher/notifications" : "/app/student/notifications";

  async function handleMarkAll() {
    await markAllNotificationsRead();
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  async function handleItemClick(id: string, isRead: boolean) {
    if (!isRead) {
      await markNotificationRead(id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {!!data?.unreadCount && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {data.unreadCount > 9 ? "9+" : data.unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="fixed left-4 right-4 top-16 z-40 w-auto rounded-2xl border border-ink-100 bg-surface shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <p className="text-sm font-semibold text-ink-900">Notifications</p>
              <button onClick={handleMarkAll} className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {!data?.data.length && <p className="px-4 py-6 text-center text-sm text-ink-400">No notifications yet</p>}
              {data?.data.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n.id, n.isRead)}
                  className={`block w-full border-b border-ink-50 px-4 py-3 text-left text-sm hover:bg-ink-50 ${!n.isRead ? "bg-brand-50/40" : ""}`}
                >
                  <p className="font-medium text-ink-800">{n.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{n.message}</p>
                  <p className="mt-1 text-[11px] text-ink-400">{timeAgo(n.createdAt)}</p>
                </button>
              ))}
            </div>
            <Link to={basePath} onClick={() => setOpen(false)} className="block border-t border-ink-100 px-4 py-2.5 text-center text-xs font-semibold text-brand-600 hover:bg-ink-50">
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
