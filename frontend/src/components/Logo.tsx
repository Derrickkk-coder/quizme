export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="11" fill="url(#eduquiz-gradient)" />
      <path
        d="M13 16.5C13 13.5 15.5 11 20 11C24.5 11 27 13.5 27 16.5C27 19 25.5 20.2 23.6 21.3C22.1 22.2 21.5 22.9 21.5 24.3H18.5C18.5 21.8 19.6 20.6 21.4 19.5C22.9 18.6 24 17.9 24 16.5C24 15 22.5 13.8 20 13.8C17.7 13.8 16.2 14.9 16 16.5H13Z"
        fill="white"
      />
      <circle cx="20" cy="28.5" r="1.8" fill="white" />
      <defs>
        <linearGradient id="eduquiz-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#0D9488" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ className = "", markClassName = "h-8 w-8", withTagline = false }: { className?: string; markClassName?: string; withTagline?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} />
      <div className="leading-tight">
        <span className="block text-lg font-extrabold tracking-tight text-ink-900">
          Edu<span className="text-brand-600">Quiz</span>
        </span>
        {withTagline && <span className="block text-[11px] font-medium text-ink-400">Learn. Practice. Improve.</span>}
      </div>
    </div>
  );
}
