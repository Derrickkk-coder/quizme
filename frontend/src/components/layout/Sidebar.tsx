import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import { Logo } from "../Logo";
import { NavItem } from "./navConfig";

interface SidebarProps {
  items: NavItem[];
  mobileOpen: boolean;
  onClose: () => void;
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
              }`
            }
          >
            <Icon className="h-4.5 w-4.5" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function Sidebar({ items, mobileOpen, onClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-ink-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto py-2">
          <NavLinks items={items} />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
          <aside className="relative z-10 flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo />
              <button onClick={onClose} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto py-2">
              <NavLinks items={items} onNavigate={onClose} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
