import { ReactNode } from "react";

export function SectionCard({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`card p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-base font-semibold text-ink-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
