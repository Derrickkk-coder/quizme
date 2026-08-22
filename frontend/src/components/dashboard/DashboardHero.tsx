import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface DashboardHeroProps {
  eyebrow: string;
  name: string;
  subtitle: string;
  icon: ReactNode;
  cta?: { label: string; to: string; icon?: ReactNode };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHero({ eyebrow, name, subtitle, icon, cta }: DashboardHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-brand-100 bg-gradient-to-br from-brand-50 via-surface to-accent-50 p-6 sm:p-8">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {getGreeting()}, {name.split(" ")[0]}!
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-ink-500 sm:text-base">{subtitle}</p>
          {cta && (
            <Link to={cta.to} className="btn-primary mt-5">
              {cta.icon}
              {cta.label}
            </Link>
          )}
        </div>
        <div className="hidden shrink-0 lg:flex">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/70 shadow-inner ring-4 ring-white dark:bg-white/5 dark:ring-white/10 xl:h-32 xl:w-32">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white xl:h-24 xl:w-24">
              {icon}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
