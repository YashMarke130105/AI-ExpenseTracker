import { cn } from "../../lib/utils";

/**
 * Small circular spinner, purple to match the target app's loader color (#9333ea).
 */
export function Spinner({ className, size = 20 }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("inline-block animate-spin-loader rounded-full border-2 border-[var(--color-purple)]/25 border-t-[var(--color-purple)]", className)}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Thin full-width bar loader, purple, matching react-spinners' BarLoader usage
 * in the target app (e.g. under the dashboard/account headers while data loads).
 */
export function BarLoader({ className }) {
  return (
    <div className={cn("relative h-[3px] w-full overflow-hidden rounded-full bg-[var(--color-purple)]/15", className)}>
      <div className="absolute inset-y-0 w-1/3 animate-bar-loader rounded-full bg-[var(--color-purple)]" />
    </div>
  );
}
