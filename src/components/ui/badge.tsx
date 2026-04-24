import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — Musical Lumina
 *
 * Two patterns under one export:
 *   <Badge>…</Badge>                         — neutral tag
 *   <Badge status="open">…</Badge>           — semantic status with color pairing
 *   <Badge variant="outline">…</Badge>       — editorial outlined metadata chip
 *
 * Status values map to registration flow language — use these rather than
 * hand-rolling colors so i18n swaps never break styling.
 */

const badgeVariants = cva(
  [
    "inline-flex items-center gap-1.5",
    "font-sans text-label uppercase tracking-[0.14em]",
    "px-2.5 py-1 rounded-sm whitespace-nowrap",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-burgundy/[0.06] text-burgundy",
        solid: "bg-burgundy !text-[#FFFBEF]",
        accent: "bg-marigold text-burgundy",
        outline: "bg-transparent border border-burgundy/25 text-burgundy",
        ghost: "bg-transparent text-ink-muted",
      },
      status: {
        none: "",
        open: "bg-status-open-bg text-status-open-fg",
        closed: "bg-status-closed-bg text-status-closed-fg",
        upcoming: "bg-status-upcoming-bg text-status-upcoming-fg",
        ended: "bg-status-ended-bg text-status-ended-fg",
        error: "bg-status-error-bg text-status-error-fg",
      },
      size: {
        sm: "text-[11px] leading-none tracking-[0.1em] px-2 py-[3px]",
        md: "text-label px-2.5 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      status: "none",
      size: "md",
    },
    compoundVariants: [
      // When a status is set, override the base variant color.
      { status: "open", className: "bg-status-open-bg text-status-open-fg" },
      { status: "closed", className: "bg-status-closed-bg text-status-closed-fg" },
      { status: "upcoming", className: "bg-status-upcoming-bg text-status-upcoming-fg" },
      { status: "ended", className: "bg-status-ended-bg text-status-ended-fg" },
    ],
  }
);

export type BadgeStatus = "open" | "closed" | "upcoming" | "ended" | "error";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Leading dot — subtle status indicator. */
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, status, size, dot, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, status, size }), className)}
        {...props}
      >
        {dot && (
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full bg-current opacity-80"
          />
        )}
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
