import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  /**
   * When true, the spinner sits above the route body in a fully opaque
   * overlay that covers nav, content, and footer. Opaque (not translucent)
   * so the previous page's footer doesn't bleed through during a lazy-route
   * transition. See AppContent → Suspense fallback.
   */
  fullScreen?: boolean;
  message?: string;
}

function LoadingSpinner({
  fullScreen = false,
  message = "Loading…",
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        // Opaque fixed overlay so the outgoing route (footer especially)
        // never bleeds through during a lazy-route transition.
        fullScreen
          ? "fixed inset-0 z-[60] bg-surface-canvas"
          : "w-full min-h-[200px] bg-transparent"
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <Loader2
          className="w-10 h-10 text-marigold animate-spin"
          aria-hidden
        />
        <p className="type-caption text-ink-muted">{message}</p>
      </div>
    </div>
  );
}

export default LoadingSpinner;