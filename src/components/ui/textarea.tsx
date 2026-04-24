import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Textarea — Musical Lumina
 *
 * Matches Input's dual-variant approach: editorial underline by default,
 * boxed outline for admin forms. Minimum 3-line height by default so the
 * writing surface feels generous, per DESIGN.md's "breathable" principle.
 */

const textareaVariants = cva(
  [
    "w-full bg-transparent font-sans text-body-md text-ink-body placeholder:text-ink-subtle",
    "transition-[border-color,background-color,box-shadow] duration-fast ease-out-quart",
    "focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "resize-y",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "min-h-[96px] px-0 py-3 border-0 border-b border-burgundy/25 rounded-none",
          "hover:border-burgundy/50",
          "focus-visible:border-marigold",
          "aria-[invalid=true]:border-[color:var(--status-error)]",
        ].join(" "),
        boxed: [
          "min-h-[96px] px-3 py-2 rounded-sm border border-burgundy/20 bg-surface-elevated",
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

export interface TextareaProps
  extends React.ComponentProps<"textarea">,
    VariantProps<typeof textareaVariants> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <textarea
        className={cn(textareaVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
