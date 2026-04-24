import { cva } from "class-variance-authority";

export const cardVariants = cva(
  "group relative bg-surface-elevated border border-rule-hairline transition-colors duration-base ease-out-quart",
  {
    variants: {
      variant: {
        default: "",
        inset: "bg-surface-canvas-warm border-rule-subtle/40",
        editorial: "border-0 border-l-2 border-l-marigold rounded-none bg-transparent",
        quiet: "border-transparent hover:border-rule-hairline",
      },
      interactive: {
        true: "cursor-pointer hover:border-burgundy/25 hover:-translate-y-0.5",
        false: "",
      },
      accent: {
        none: "",
        event: "before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-burgundy before:content-['']",
        masterclass: "before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-marigold before:content-['']",
        group: "before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-charcoal before:content-['']",
        past: "before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:bg-ink-subtle before:content-['']",
      },
      radius: {
        sharp: "rounded-none",
        soft: "rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
      accent: "none",
      radius: "sharp",
    },
  }
);
