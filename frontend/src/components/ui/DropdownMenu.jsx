import { cloneElement, createContext, useContext, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

const DropdownContext = createContext(null);

export function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block" ref={rootRef}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ children, asChild, className }) {
  const { open, setOpen } = useContext(DropdownContext);
  const onClick = (e) => {
    e.stopPropagation();
    setOpen((o) => !o);
  };
  if (asChild && children?.type) {
    return cloneElement(children, { onClick, "aria-expanded": open });
  }
  return (
    <button type="button" onClick={onClick} className={className} aria-expanded={open}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({ children, align = "end", className }) {
  const { open } = useContext(DropdownContext);
  if (!open) return null;
  return (
    <div
      className={cn(
        "absolute z-50 mt-1 min-w-[10rem] overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-md animate-fade-up",
        align === "end" ? "right-0" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ children, onClick, className, destructive = false }) {
  const { setOpen } = useContext(DropdownContext);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
        setOpen(false);
      }}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-black/[0.04]",
        destructive ? "text-[var(--color-rust)] hover:bg-[var(--color-rust-soft)]" : "text-[var(--color-ink)]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ children, className }) {
  return <div className={cn("px-2 py-1.5 text-xs font-medium text-[var(--color-ink-soft)]", className)}>{children}</div>;
}

export function DropdownMenuSeparator({ className }) {
  return <div className={cn("my-1 h-px bg-[var(--color-line)]", className)} />;
}
