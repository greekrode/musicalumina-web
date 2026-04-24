import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Label — Musical Lumina
 *
 * Two treatments:
 *  - `default`  → sentence-case, title-sized. For admin forms where scan speed matters.
 *  - `editorial` → uppercase + wide tracking. Sits above underline inputs on public
 *                  forms for the "premium archival documentation" feel per DESIGN.md.
 */
const labelVariants = cva(
  "inline-block font-sans text-burgundy peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
  {
    variants: {
      variant: {
        default: "text-body-sm font-medium mb-2",
        editorial: "type-label text-ink-accent mb-3",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, variant, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants({ variant }), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label, labelVariants };
