import { cloneElement, createContext, useContext, useState } from "react";
import { cn } from "../../lib/utils";

const TooltipContext = createContext(null);

export function TooltipProvider({ children }) {
  return children;
}

export function Tooltip({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <span className="relative inline-flex">{children}</span>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ children, asChild }) {
  const { setOpen } = useContext(TooltipContext);
  const handlers = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
  };
  if (asChild && children?.type) {
    return cloneElement(children, handlers);
  }
  return <span {...handlers}>{children}</span>;
}

export function TooltipContent({ children, className, side = "top" }) {
  const { open } = useContext(TooltipContext);
  if (!open) return null;
  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  };
  return (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-[var(--color-ink)] px-2 py-1 text-xs text-white shadow-md animate-fade-up",
        sideClasses[side],
        className
      )}
    >
      {children}
    </span>
  );
}
