import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — Musical Lumina
 *
 * API contract preserved: every existing variant name (default, destructive,
 * outline, secondary, ghost, link, elegant) and every size continues to work.
 * Only the visual treatment has been rewritten to the Ethereal Resonance system.
 *
 * Primary CTAs use marigold-fill-on-burgundy-text — the brand's signature pairing.
 * Secondary structural actions use burgundy fill. Ghost and link variants stay
 * quiet so they compose inside paragraphs and metadata without fighting content.
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-sans font-semibold tracking-[0.01em]",
    "transition-[background-color,color,border-color,transform] duration-base ease-out-quart",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas",
    "disabled:pointer-events-none disabled:cursor-not-allowed",
    "rounded-sm",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary CTA — marigold fill on burgundy ink. Disabled = soft cream
        // tint with muted marigold text so it reads as a deliberate state,
        // not a washed-out version of the enabled button.
        default: [
          "bg-marigold text-burgundy hover:bg-marigold-600 active:bg-marigold-700 active:text-[#FFFBEF]",
          "disabled:bg-marigold-100 disabled:text-marigold-700/75 disabled:hover:bg-marigold-100",
        ].join(" "),

        // Structural — burgundy ink-field with explicit ivory text.
        secondary: [
          "bg-burgundy !text-[#FFFBEF] hover:bg-burgundy-600 active:bg-burgundy-700",
          "disabled:bg-burgundy-100 disabled:!text-burgundy-400 disabled:hover:bg-burgundy-100",
        ].join(" "),

        // Outline — editorial hairline with marigold hover fill.
        outline: [
          "border border-burgundy/30 text-burgundy bg-transparent hover:border-marigold hover:bg-marigold hover:text-burgundy",
          "disabled:border-burgundy/15 disabled:text-burgundy/40 disabled:hover:bg-transparent disabled:hover:border-burgundy/15",
        ].join(" "),

        // Ghost — quiet, in-flow; for secondary navigation.
        ghost: [
          "text-burgundy hover:bg-burgundy/[0.06] hover:text-burgundy",
          "disabled:text-burgundy/35 disabled:hover:bg-transparent",
        ].join(" "),

        // Link — inline text, underline-offset tuned for serif body.
        link: [
          "text-burgundy underline underline-offset-[0.25em] decoration-burgundy/40 decoration-[1px] hover:decoration-marigold hover:decoration-[1.5px] hover:text-burgundy px-0 py-0 h-auto",
          "disabled:text-burgundy/40 disabled:decoration-burgundy/20",
        ].join(" "),

        // Destructive — muted red-burgundy with explicit ivory text.
        destructive: [
          "bg-[#8b3a3a] !text-[#FFFBEF] hover:bg-[#7a2e2e]",
          "disabled:bg-[#d9bcbc] disabled:!text-[#8b3a3a]/70 disabled:hover:bg-[#d9bcbc]",
        ].join(" "),

        // Elegant — outlined marigold that fills on hover.
        elegant: [
          "border border-marigold text-marigold bg-transparent hover:bg-marigold hover:text-burgundy",
          "disabled:border-marigold/30 disabled:text-marigold/50 disabled:hover:bg-transparent disabled:hover:text-marigold/50",
        ].join(" "),
      },
      size: {
        default: "h-11 px-6 text-body-sm",
        sm: "h-9 px-4 text-caption",
        lg: "h-12 px-8 text-body-md",
        xl: "h-14 px-10 text-body-md tracking-[0.02em]",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
