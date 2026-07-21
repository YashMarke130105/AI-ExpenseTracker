import { useEffect } from "react";
import { cn } from "../../lib/utils";

export function Drawer({ open, onOpenChange, children }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onOpenChange?.(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-up"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[calc(100vh-4rem)] animate-fade-up overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export function DrawerContent({ children, className }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-lg max-h-[calc(100vh-5rem)] overflow-y-auto",
        className
      )}
    >
      <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-[var(--color-line)]" />
      {children}
    </div>
  );
}

export function DrawerHeader({ children, className }) {
  return <div className={cn("px-6 pt-4 pb-2 text-center sm:text-left", className)}>{children}</div>;
}

export function DrawerTitle({ children, className }) {
  return <h2 className={cn("font-display text-lg font-medium", className)}>{children}</h2>;
}

export function DrawerDescription({ children, className }) {
  return <p className={cn("text-sm text-[var(--color-ink-soft)]", className)}>{children}</p>;
}

export function DrawerFooter({ children, className }) {
  return <div className={cn("flex flex-col gap-2 px-6 pb-6 pt-2", className)}>{children}</div>;
}

export function DrawerClose({ children, onClick, className }) {
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
