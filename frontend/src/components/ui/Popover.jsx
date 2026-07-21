import { cloneElement, createContext, useContext, useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

const PopoverContext = createContext(null);

export function Popover({ open: controlledOpen, onOpenChange, children }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (val) => {
    if (!isControlled) setUncontrolledOpen(val);
    onOpenChange?.(val);
  };
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
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block" ref={rootRef}>
        {children}
      </div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({ children, asChild, className }) {
  const { open, setOpen } = useContext(PopoverContext);
  const onClick = (e) => {
    e.stopPropagation();
    setOpen(!open);
  };
  if (asChild && children?.type) {
    return cloneElement(children, { onClick, "aria-expanded": open });
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function PopoverContent({ children, align = "start", className }) {
  const { open } = useContext(PopoverContext);
  if (!open) return null;
  return (
    <div
      className={cn(
        "absolute z-50 mt-2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3 shadow-lg animate-fade-up",
        align === "end" ? "right-0" : align === "center" ? "left-1/2 -translate-x-1/2" : "left-0",
        className
      )}
    >
      {children}
    </div>
  );
}
