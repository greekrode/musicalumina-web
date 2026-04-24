import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Image } from "@/components/ui/image";
import { NoteGlyph } from "@/components/ui/wireframe-wave";
import { cn } from "@/lib/utils";

/**
 * EventGallery — Musical Lumina
 *
 * Editorial photo carousel for past event pages. Replaces the old
 * `EventHighlightsCarousel` with:
 *
 *   - The new `<Image>` primitive (lazy, decode-async, layout-stable).
 *   - Editorial numerical counter ("03 / 08") instead of bottom dots.
 *   - Auto-advance every 5 seconds, paused while the user hovers.
 *   - Cross-fade transitions via framer-motion AnimatePresence.
 *   - Branded empty / loading states.
 */

const EASE = [0.19, 1, 0.22, 1] as const;
const AUTO_ADVANCE_MS = 5000;

interface EventGalleryProps {
  images: string[];
  isLoading: boolean;
  className?: string;
}

export function EventGallery({ images, isLoading, className }: EventGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const reduceMotion = useReducedMotion();

  const next = useCallback(() => {
    setCurrentIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  const prev = () => {
    setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  };

  // Auto-advance — pauses on hover so the user can study a frame. Also
  // disabled for users who prefer reduced motion: an auto-changing carousel
  // is the exact kind of involuntary motion that triggers vestibular issues.
  useEffect(() => {
    if (reduceMotion || images.length <= 1 || isHovered) return;
    const timer = window.setInterval(next, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [next, images.length, isHovered, reduceMotion]);

  // Reset to first slide if the image set shrinks below the current index.
  useEffect(() => {
    if (currentIndex >= images.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, images.length]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "relative w-full bg-surface-canvas-warm border border-rule-hairline overflow-hidden",
          "aspect-[16/9]",
          className
        )}
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-surface-canvas-warm via-surface-canvas to-surface-canvas-mist motion-safe:animate-pulse"
        />
        <div className="absolute bottom-6 right-6 type-label text-ink-muted">
          Loading photos…
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div
        className={cn(
          "relative w-full bg-surface-canvas-warm border border-rule-hairline",
          "aspect-[16/9] flex flex-col items-center justify-center gap-3",
          className
        )}
      >
        <NoteGlyph size={48} className="text-marigold/25" aria-hidden />
        <p className="type-caption text-ink-muted">
          No photos archived for this event.
        </p>
      </div>
    );
  }

  const total = images.length;

  return (
    <div
      className={cn(
        "group relative w-full bg-surface-canvas-warm border border-rule-hairline overflow-hidden",
        "aspect-[16/9]",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] bg-marigold z-10"
      />

      {/* Slides — stacked, cross-fade between them */}
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={currentIndex}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE }}
          className="absolute inset-0"
        >
          <Image
            src={images[currentIndex]}
            alt={`Event photo ${currentIndex + 1} of ${total}`}
            // First image gets priority (eager + fetchpriority high).
            priority={currentIndex === 0}
            fit="cover"
            containerClassName="w-full h-full"
            className="w-full h-full"
          />
        </motion.div>
      </AnimatePresence>

      {/* Numerical indicator — top-right, editorial */}
      {total > 1 && (
        <div className="absolute top-5 right-5 z-20 type-label text-offWhite/95 bg-burgundy/55 backdrop-blur-sm px-3 py-1.5">
          {String(currentIndex + 1).padStart(2, "0")}
          <span className="text-offWhite/55"> / {String(total).padStart(2, "0")}</span>
        </div>
      )}

      {/* Nav arrows — appear on hover */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 z-20",
              "h-10 w-10 flex items-center justify-center",
              "bg-burgundy/55 text-offWhite backdrop-blur-sm",
              "transition-[opacity,background-color] duration-base ease-out-quart",
              "opacity-0 group-hover:opacity-100 hover:bg-burgundy/75",
              "focus-visible:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2"
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 z-20",
              "h-10 w-10 flex items-center justify-center",
              "bg-burgundy/55 text-offWhite backdrop-blur-sm",
              "transition-[opacity,background-color] duration-base ease-out-quart",
              "opacity-0 group-hover:opacity-100 hover:bg-burgundy/75",
              "focus-visible:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2"
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Subtle progress bar at bottom — visualizes auto-advance timing.
          Hidden under reduced-motion since auto-advance itself is disabled. */}
      {total > 1 && !isHovered && !reduceMotion && (
        <motion.div
          key={`progress-${currentIndex}`}
          aria-hidden
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: "linear" }}
          className="absolute inset-x-0 bottom-0 h-[2px] bg-marigold/80 origin-left z-10"
        />
      )}
    </div>
  );
}
