import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { badgeVariants, type BadgeStatus } from "./badge-variants";

/**
 * Badge — Musical Lumina
 *
 * Two patterns under one export:
 *   <Badge>…</Badge>                         — neutral tag
 *   <Badge status="open">…</Badge>           — semantic status with color pairing
 *   <Badge variant="outline">…</Badge>       — editorial outlined metadata chip
 *
 * Status values map to registration flow language — use these rather than
 * hand-rolling colors so i18n swaps never break styling. The cva definition
 * lives in `./badge-variants`.
 */

export type { BadgeStatus };

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

export { Badge };
