import { cn } from "../../lib/utils";

export function Badge({ className, variant = "default", style, ...props }) {
  const variants = {
    default: "bg-[var(--color-ledger-soft)] text-[var(--color-ledger)]",
    rust: "bg-[var(--color-rust-soft)] text-[var(--color-rust)]",
    outline: "border border-[var(--color-line)] text-[var(--color-ink-soft)]",
  };
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
