import { Loader2 } from "lucide-react";

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 className={`animate-spin text-brand-500 ${className}`} />;
}

export function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
