import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { cardVariants } from "./card-variants";

/**
 * Card — Musical Lumina
 *
 * Depth via hairline + tonal shift, never drop shadow (per DESIGN.md).
 * Content-type differentiation lives in the `accent` prop — a 1.5px top
 * border that color-codes the card without adding chrome.
 *
 * All sub-components (CardHeader, CardTitle, CardDescription, CardContent,
 * CardFooter) preserve their original API. Existing call sites work unchanged.
 * The cva definition lives in `./card-variants`.
 */

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, accent, radius, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, interactive, accent, radius }),
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-2 p-8 pb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("type-headline-sm text-burgundy", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("type-body-sm text-ink-muted", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("px-8 pb-6", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between gap-4 px-8 py-5 border-t border-rule-hairline",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

/** CardEyebrow — small uppercase label sitting above a CardTitle.
 *  New sub-component; doesn't affect existing API. */
const CardEyebrow = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("type-label text-ink-accent", className)}
    {...props}
  />
));
CardEyebrow.displayName = "CardEyebrow";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  CardEyebrow,
};
