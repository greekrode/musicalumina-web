import { Fragment } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Modal — Musical Lumina
 *
 * Editorial dialog shell. Replaces the rounded-card / dark-scrim treatment
 * with the same visual grammar used across the rest of the redesign:
 *
 *   - Burgundy-tinted backdrop with subtle blur (not a black scrim)
 *   - Sharp-cornered surface with hairline border + marigold top accent rule
 *   - Editorial header: optional eyebrow + serif title + close button
 *   - Generous padding, scroll-locked body, max 90vh
 *
 * API preserved so every existing callsite continues to work.
 */

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Optional uppercase eyebrow above the title — small editorial flourish. */
  eyebrow?: string;
  /**
   * Container max-width preset. Limited to the values actually used by the
   * codebase so Tailwind's JIT picks every class up at build time.
   */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  /** Custom content rendered next to the close button (e.g. action buttons). */
  headerContent?: React.ReactNode;
  /** Hide the close button entirely (e.g. for a forced-loading state). */
  hideClose?: boolean;
  children: React.ReactNode;
}

// Static class map so Tailwind keeps every variant in the build.
const MAX_WIDTH_CLASSES: Record<NonNullable<ModalProps["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

function Modal({
  isOpen,
  onClose,
  title,
  eyebrow,
  maxWidth = "md",
  children,
  headerContent,
  hideClose = false,
}: ModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop — burgundy tint at low alpha + frosted blur, not a dark scrim */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-burgundy-700/25 backdrop-blur-md" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-3 scale-[0.98]"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-3 scale-[0.98]"
            >
              <DialogPanel
                className={cn(
                  "relative w-full transform overflow-hidden text-left align-middle",
                  "bg-surface-elevated border border-rule-hairline",
                  "max-h-[90vh] flex flex-col",
                  MAX_WIDTH_CLASSES[maxWidth]
                )}
              >
                {/* Marigold top accent rule — same grammar as cards across the system */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[2px] bg-marigold z-10"
                />

                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 sm:px-8 pt-7 sm:pt-8 pb-5 border-b border-rule-hairline flex-shrink-0">
                  <div className="flex flex-col gap-2 min-w-0">
                    {eyebrow && (
                      <span className="type-label text-ink-accent">
                        {eyebrow}
                      </span>
                    )}
                    <DialogTitle
                      as="h3"
                      className="type-headline-md text-burgundy text-balance"
                    >
                      {title}
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    {headerContent}
                    {!hideClose && (
                      <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className={cn(
                          "h-9 w-9 flex items-center justify-center rounded-sm",
                          "text-ink-muted hover:text-burgundy hover:bg-burgundy/[0.06]",
                          "transition-colors duration-fast ease-out-quart",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2"
                        )}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 sm:px-8 py-7 sm:py-8 overflow-y-auto flex-1 min-h-0">
                  {children}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export default Modal;
