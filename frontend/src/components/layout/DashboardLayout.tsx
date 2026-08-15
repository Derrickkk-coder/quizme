import { useState, ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { NavItem } from "./navConfig";

export function DashboardLayout({ navItems, title, children }: { navItems: NavItem[]; title?: string; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <Sidebar items={navItems} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
