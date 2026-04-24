import { cva } from "class-variance-authority";

export const textareaVariants = cva(
  [
    "w-full bg-transparent font-sans text-body-md text-ink-body placeholder:text-ink-subtle",
    "transition-[border-color,background-color,box-shadow] duration-fast ease-out-quart",
    "focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "resize-y",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "min-h-[96px] px-0 py-3 border-0 border-b border-burgundy/25 rounded-none",
          "hover:border-burgundy/50",
          "focus-visible:border-marigold",
          "aria-[invalid=true]:border-[color:var(--status-error)]",
        ].join(" "),
        boxed: [
          "min-h-[96px] px-3 py-2 rounded-sm border border-burgundy/20 bg-surface-elevated",
          "hover:border-burgundy/40",
          "focus-visible:border-marigold focus-visible:ring-2 focus-visible:ring-marigold/20",
          "aria-[invalid=true]:border-[color:var(--status-error)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);
