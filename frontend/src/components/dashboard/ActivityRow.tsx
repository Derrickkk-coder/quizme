import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface ActivityRowProps {
  icon: ReactNode;
  iconClassName?: string;
  title: ReactNode;
  subtitle: ReactNode;
  meta?: ReactNode;
  timestamp?: string;
  to?: string;
}

export function ActivityRow({ icon, iconClassName = "bg-brand-50 text-brand-600", title, subtitle, meta, timestamp, to }: ActivityRowProps) {
  const content = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink-800">{title}</p>
        <p className="truncate text-xs text-ink-400">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {meta}
        {timestamp && <span className="hidden text-xs text-ink-400 sm:inline">{timestamp}</span>}
        {to && <ChevronRight className="h-4 w-4 text-ink-300" />}
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition-colors hover:border-ink-200 hover:bg-ink-50/60">
        {content}
      </Link>
    );
  }
  return <div className="flex items-center gap-3 rounded-xl border border-ink-100 p-3">{content}</div>;
}
