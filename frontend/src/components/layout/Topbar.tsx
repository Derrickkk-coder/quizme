import { useState } from "react";
import { Menu, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "../ui/ThemeToggle";
import { initials } from "../../utils/format";

export function Topbar({ onMenuClick, title }: { onMenuClick: () => void; title?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const profilePath = user?.role === "ADMIN" ? "/app/admin/profile" : user?.role === "TEACHER" ? "/app/teacher/profile" : "/app/student/profile";

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-ink-200 bg-surface px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        {title && <h1 className="text-lg font-semibold text-ink-900">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />

        <div className="relative">
          <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-ink-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
              {user ? initials(user.name) : ""}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-ink-800">{user?.name}</p>
              <p className="text-xs capitalize leading-tight text-ink-400">{user?.role.toLowerCase()}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-ink-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-40 mt-2 w-48 rounded-xl border border-ink-100 bg-surface py-1 shadow-xl">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(profilePath);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
                >
                  <UserIcon className="h-4 w-4" /> Profile
                </button>
                <button onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
