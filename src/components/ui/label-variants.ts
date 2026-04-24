import { cva } from "class-variance-authority";

export const labelVariants = cva(
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
