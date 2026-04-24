import * as React from "react";
import { cn } from "@/lib/utils";
import { NoteGlyph } from "./wireframe-wave";

/**
 * Image — Musical Lumina
 *
 * A wrapper around <img> that adds the practical wins teams expect from
 * frameworks like Next.js's <Image>:
 *
 *   - Native `loading="lazy"` by default; opt-in `priority` for above-fold.
 *   - `decoding="async"` so the main thread doesn't block on decode.
 *   - `fetchpriority="high"` for priority images (paired with `loading="eager"`).
 *   - Aspect-ratio container that prevents Cumulative Layout Shift while the
 *     image loads.
 *   - Skeleton placeholder with a subtle marigold pulse during load.
 *   - Branded fallback (NoteGlyph) on error.
 *   - Browser HTTP cache works as expected — Supabase Storage sets sane
 *     Cache-Control headers and CDNs (Cloudflare, Vercel) will respect them.
 *
 * For Supabase Storage with image transformations enabled (Pro plan),
 * pass a `?width=...&quality=...` query string into `src`. Signed URLs from
 * `createSignedUrl` are passed through unchanged.
 */

export interface ImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "loading" | "decoding"> {
  src: string;
  alt: string;
  /**
   * Aspect ratio for the container — prevents layout shift while loading.
   * Examples: "16/9", "4/5", "3/4", "1/1". If omitted, the container has no
   * explicit aspect and the image's intrinsic size flows naturally.
   */
  aspect?: string;
  /**
   * Eager load + `fetchpriority="high"`. Use only for hero / above-fold
   * images that must arrive in the first paint. Default is lazy.
   */
  priority?: boolean;
  /**
   * Hide the loading skeleton. Useful when this image sits over a colored
   * surface where the skeleton tone clashes.
   */
  hideSkeleton?: boolean;
  /**
   * Container className — wraps the <img>, skeleton, and error fallback.
   */
  containerClassName?: string;
  /**
   * Object-fit for the image. Defaults to "cover".
   */
  fit?: "cover" | "contain" | "fill" | "scale-down" | "none";
  /**
   * Custom fallback to render when the image fails to load.
   * Defaults to a branded NoteGlyph on a warm-cream background.
   */
  fallback?: React.ReactNode;
}

const Image = React.forwardRef<HTMLImageElement, ImageProps>(
  (
    {
      src,
      alt,
      aspect,
      priority = false,
      hideSkeleton = false,
      containerClassName,
      className,
      fit = "cover",
      fallback,
      onLoad,
      onError,
      ...rest
    },
    ref
  ) => {
    const [status, setStatus] = React.useState<"loading" | "loaded" | "error">(
      "loading"
    );

    // Reset status when src changes (e.g. carousel switching slides).
    React.useEffect(() => {
      setStatus("loading");
    }, [src]);

    const handleLoad: React.ReactEventHandler<HTMLImageElement> = (e) => {
      setStatus("loaded");
      onLoad?.(e);
    };

    const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
      setStatus("error");
      onError?.(e);
    };

    const aspectStyle = aspect ? { aspectRatio: aspect } : undefined;

    return (
      <div
        className={cn(
          "relative overflow-hidden bg-surface-canvas-warm",
          containerClassName
        )}
        style={aspectStyle}
      >
        {/* Skeleton — visible while image is loading */}
        {!hideSkeleton && status === "loading" && (
          <div
            aria-hidden
            className={cn(
              "absolute inset-0",
              "bg-gradient-to-br from-surface-canvas-warm via-surface-canvas to-surface-canvas-mist",
              "motion-safe:animate-pulse"
            )}
          />
        )}

        {/* Error fallback */}
        {status === "error" &&
          (fallback ?? (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-canvas-warm">
              <NoteGlyph
                size={48}
                className="text-marigold/25"
                aria-hidden
              />
            </div>
          ))}

        {/* The image itself — hidden until loaded so we don't flash partial bytes */}
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          // fetchpriority is not in older React types; cast through any to ensure it lands on the DOM.
          {...({ fetchpriority: priority ? "high" : "auto" } as unknown as Record<string, string>)}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "block w-full h-full",
            fit === "cover" && "object-cover",
            fit === "contain" && "object-contain",
            fit === "fill" && "object-fill",
            fit === "scale-down" && "object-scale-down",
            fit === "none" && "object-none",
            "transition-opacity duration-slow ease-out-quart",
            status === "loaded" ? "opacity-100" : "opacity-0",
            className
          )}
          {...rest}
        />
      </div>
    );
  }
);
Image.displayName = "Image";

export { Image };
