import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { textareaVariants } from "./textarea-variants";

/**
 * Textarea — Musical Lumina
 *
 * Matches Input's dual-variant approach: editorial underline by default,
 * boxed outline for admin forms. Minimum 3-line height by default so the
 * writing surface feels generous, per DESIGN.md's "breathable" principle.
 * The cva definition lives in `./textarea-variants`.
 */

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

export { Textarea };
