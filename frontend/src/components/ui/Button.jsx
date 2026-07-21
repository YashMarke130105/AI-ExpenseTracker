import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-ledger)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-ledger)] text-white hover:bg-[#1d4ed8] shadow-sm",
        gradient:
          "text-white shadow-sm bg-[linear-gradient(to_bottom_right,#2563eb,#9333ea)] hover:opacity-90",
        destructive: "bg-[var(--color-rust)] text-white hover:bg-[#b91c1c]",
        outline: "border border-[var(--color-line)] bg-transparent hover:bg-black/[0.03] text-[var(--color-ink)]",
        ghost: "hover:bg-black/[0.04] text-[var(--color-ink)]",
        link: "text-[var(--color-ledger)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const Button = forwardRef(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";

export { Button, buttonVariants };
