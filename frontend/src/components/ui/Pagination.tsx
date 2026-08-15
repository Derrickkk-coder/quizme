import { ChevronLeft, ChevronRight } from "lucide-react";
import { PaginationMeta } from "../../types";

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3">
      <p className="text-xs text-ink-500">
        Page {meta.page} of {meta.totalPages} &middot; {meta.total} total
      </p>
      <div className="flex gap-2">
        <button
          className="btn-secondary btn-sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        <button
          className="btn-secondary btn-sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
