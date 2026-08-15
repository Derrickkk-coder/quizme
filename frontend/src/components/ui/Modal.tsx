import { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({ open, onClose, title, children, footer, size = "md" }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <h3 className="text-base font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}
