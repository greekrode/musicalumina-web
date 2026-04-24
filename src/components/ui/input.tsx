import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { inputVariants } from "./input-variants";

/**
 * Input — Musical Lumina
 *
 * Editorial treatment: bottom-border-only, marigold focus line, ivory field.
 * The `variant="boxed"` option preserves the older full-outline input for
 * admin tables where dense data entry benefits from a visible field. The
 * cva definition lives in `./input-variants`.
 */

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

export { Input };
