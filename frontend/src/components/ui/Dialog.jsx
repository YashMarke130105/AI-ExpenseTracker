import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export function Dialog({ open, onClose, title, description, children, className }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 animate-fade-up" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-lg animate-fade-up",
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {title && <h2 className="font-display text-xl font-medium mb-1">{title}</h2>}
        {description && <p className="text-sm text-[var(--color-ink-soft)] mb-4">{description}</p>}
        {children}
      </div>
    </div>
  );
}
