import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Eyebrow — Musical Lumina
 *
 * A small uppercase marker used above titles, beside metadata, or as a
 * section anchor. Pairs with PageHeader and Card. Optional leading rule
 * evokes the editorial "lede dash" used in magazine deck copy.
 */
export interface EyebrowProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Show a short leading rule before the text (24px marigold line). */
  withRule?: boolean;
  /** Color tone. Defaults to accent (marigold). */
  tone?: "accent" | "primary" | "muted" | "inverse";
}

const toneClasses: Record<NonNullable<EyebrowProps["tone"]>, string> = {
  accent: "text-ink-accent",
  primary: "text-burgundy",
  muted: "text-ink-muted",
  inverse: "text-offWhite/80",
};

const Eyebrow = React.forwardRef<HTMLSpanElement, EyebrowProps>(
  ({ className, withRule, tone = "accent", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "type-label inline-flex items-center gap-3",
          toneClasses[tone],
          className
        )}
        {...props}
      >
        {withRule && (
          <span
            aria-hidden
            className={cn(
              "inline-block h-px w-6",
              tone === "accent" ? "bg-marigold" : "bg-current opacity-60"
            )}
          />
        )}
        {children}
      </span>
    );
  }
);
Eyebrow.displayName = "Eyebrow";

export { Eyebrow };
