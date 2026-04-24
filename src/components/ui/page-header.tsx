import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * PageHeader — Musical Lumina
 *
 * Editorial page title block. Three compositional patterns:
 *
 *   align="start"   — left-aligned, asymmetric. Default for all editorial pages.
 *   align="center"  — centered, reserved for landing / confirmation moments.
 *   align="split"   — headline left, supporting content right. Magazine spread.
 *
 * Composes small parts (Eyebrow, Title, Lede, Meta) so each page can tune
 * the hierarchy without rewriting layout code.
 */

const headerVariants = cva("flex flex-col gap-5", {
  variants: {
    align: {
      start: "items-start text-left max-w-3xl",
      center: "items-center text-center max-w-3xl mx-auto",
      split: "md:grid md:grid-cols-[1.2fr_1fr] md:gap-16 md:items-end",
    },
    size: {
      md: "",
      lg: "gap-7",
      xl: "gap-8",
    },
  },
  defaultVariants: {
    align: "start",
    size: "lg",
  },
});

export interface PageHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof headerVariants> {}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, align, size, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(headerVariants({ align, size }), className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
PageHeader.displayName = "PageHeader";

/** Small uppercase label sitting above the title — category or section marker. */
const PageHeaderEyebrow = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "type-label text-ink-accent",
      "before:inline-block before:w-6 before:h-px before:bg-marigold before:align-middle before:mr-3",
      className
    )}
    {...props}
  />
));
PageHeaderEyebrow.displayName = "PageHeaderEyebrow";

/** The primary headline — sized per page context. */
export interface PageHeaderTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: "xl" | "lg" | "md";
  as?: "h1" | "h2";
}
const PageHeaderTitle = React.forwardRef<HTMLHeadingElement, PageHeaderTitleProps>(
  ({ className, size = "xl", as: Component = "h1", ...props }, ref) => (
    <Component
      ref={ref}
      className={cn(
        "text-burgundy text-balance",
        size === "xl" && "type-display-lg",
        size === "lg" && "type-display-md",
        size === "md" && "type-headline-lg",
        className
      )}
      {...props}
    />
  )
);
PageHeaderTitle.displayName = "PageHeaderTitle";

/** Supporting paragraph — editorial lede. */
const PageHeaderLede = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      "type-body-lg text-ink-muted max-w-[62ch] text-pretty",
      className
    )}
    {...props}
  />
));
PageHeaderLede.displayName = "PageHeaderLede";

/** Metadata row — dates, categories, counts. */
const PageHeaderMeta = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-wrap items-center gap-x-6 gap-y-2 type-caption text-ink-muted",
      className
    )}
    {...props}
  />
));
PageHeaderMeta.displayName = "PageHeaderMeta";

/** Actions slot — for CTAs sitting beside the title in split layouts. */
const PageHeaderActions = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-wrap items-center gap-3", className)}
    {...props}
  />
));
PageHeaderActions.displayName = "PageHeaderActions";

export {
  PageHeader,
  PageHeaderEyebrow,
  PageHeaderTitle,
  PageHeaderLede,
  PageHeaderMeta,
  PageHeaderActions,
};
