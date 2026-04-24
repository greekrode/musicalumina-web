import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { sectionVariants, containerVariants } from "./section-variants";

/**
 * Section — Musical Lumina
 *
 * Enforces "The Pause" rhythm from DESIGN.md: generous vertical breathing room
 * between major content blocks. Uses `--pause-section` and `--pause-major`
 * fluid tokens that scale smoothly between mobile and desktop.
 *
 * Tone variants shift the surface tint without breaking palette cohesion —
 * tonal layering replaces shadows as our hierarchy mechanism.
 *
 * The cva definitions live in `./section-variants`.
 */

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

export { Section, Container };
