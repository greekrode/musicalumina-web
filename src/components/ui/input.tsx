import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Input — Musical Lumina
 *
 * Editorial treatment: bottom-border-only, marigold focus line, ivory field.
 * The `variant="boxed"` option preserves the older full-outline input for
 * admin tables where dense data entry benefits from a visible field.
 */

const inputVariants = cva(
  [
    "w-full bg-transparent font-sans text-body-md text-ink-body placeholder:text-ink-subtle",
    "transition-[border-color,background-color,box-shadow] duration-fast ease-out-quart",
    "focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "file:border-0 file:bg-transparent file:text-body-sm file:font-medium file:text-burgundy",
  ].join(" "),
  {
    variants: {
      variant: {
        // Default: underline-only, editorial, marigold on focus.
        default: [
          "h-11 px-0 py-2 border-0 border-b border-burgundy/25 rounded-none",
          "hover:border-burgundy/50",
          "focus-visible:border-marigold",
          "aria-[invalid=true]:border-[color:var(--status-error)]",
        ].join(" "),
        // Boxed: full outline, for dense admin forms. Lower chrome than default shadcn.
        boxed: [
          "h-11 px-3 py-2 rounded-sm border border-burgundy/20 bg-surface-elevated",
          "hover:border-burgundy/40",
          "focus-visible:border-marigold focus-visible:ring-2 focus-visible:ring-marigold/20",
          "aria-[invalid=true]:border-[color:var(--status-error)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(inputVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
