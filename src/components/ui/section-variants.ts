import { cva } from "class-variance-authority";

export const sectionVariants = cva("relative w-full", {
  variants: {
    tone: {
      canvas: "bg-surface-canvas text-ink-body",
      warm: "bg-surface-canvas-warm text-ink-body",
      mist: "bg-surface-canvas-mist text-ink-body",
      elevated: "bg-surface-elevated text-ink-body",
      inverse: "bg-burgundy-700 text-offWhite",
    },
    pause: {
      none: "py-0",
      sm: "py-[var(--space-7)]",         // ~48-60
      md: "py-[var(--pause-section)]",   // 64 → 120 fluid
      lg: "py-[var(--pause-major)]",     // 80 → 160 fluid
    },
    rule: {
      none: "",
      top: "border-t border-rule-hairline",
      bottom: "border-b border-rule-hairline",
      both: "border-y border-rule-hairline",
    },
  },
  defaultVariants: {
    tone: "canvas",
    pause: "md",
    rule: "none",
  },
});

export const containerVariants = cva("mx-auto w-full", {
  variants: {
    size: {
      prose: "max-w-prose",                // 68ch — long-form reading
      narrow: "max-w-2xl",                 // 672
      default: "max-w-container",          // 1280
      wide: "max-w-[1440px]",
      full: "max-w-none",
    },
    gutter: {
      none: "px-0",
      sm: "px-4 sm:px-6",
      md: "px-4 sm:px-8 lg:px-12",
      lg: "px-4 sm:px-8 lg:px-16",
    },
  },
  defaultVariants: {
    size: "default",
    gutter: "md",
  },
});
