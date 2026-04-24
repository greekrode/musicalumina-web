import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Section — Musical Lumina
 *
 * Enforces "The Pause" rhythm from DESIGN.md: generous vertical breathing room
 * between major content blocks. Uses `--pause-section` and `--pause-major`
 * fluid tokens that scale smoothly between mobile and desktop.
 *
 * Tone variants shift the surface tint without breaking palette cohesion —
 * tonal layering replaces shadows as our hierarchy mechanism.
 */

const sectionVariants = cva("relative w-full", {
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

type SectionElement = "section" | "div" | "article" | "header" | "footer";

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {
  /** Render as a specific element — defaults to <section>. */
  as?: SectionElement;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, tone, pause, rule, as = "section", ...props }, ref) => {
    const Component = as as React.ElementType;
    return (
      <Component
        ref={ref}
        className={cn(sectionVariants({ tone, pause, rule }), className)}
        {...props}
      />
    );
  }
);
Section.displayName = "Section";

/**
 * Container — constrained content width with responsive edge margins.
 * Use inside Section for consistent gutter behavior across pages.
 */
const containerVariants = cva("mx-auto w-full", {
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

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, gutter, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(containerVariants({ size, gutter }), className)}
        {...props}
      />
    );
  }
);
Container.displayName = "Container";

export { Section, Container, sectionVariants, containerVariants };
