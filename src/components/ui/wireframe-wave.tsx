import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * WireframeWave — Musical Lumina
 *
 * The brand's signature decorative element (per DESIGN.md): thin, low-opacity
 * wave lines evoking musical waveforms. Used as a section backdrop or divider.
 *
 * Kept as a React component (not a raw SVG asset) so the color, density, and
 * opacity can be tuned per-surface without generating new asset files.
 */

export interface WireframeWaveProps extends React.SVGProps<SVGSVGElement> {
  /** Number of wave lines. More = denser texture. Default 5. */
  lines?: number;
  /** Stroke color — accepts any CSS color; defaults to current burgundy. */
  color?: string;
  /** Wave amplitude 0-1. Higher = more dramatic crests. */
  amplitude?: number;
  /** Fixed or fluid positioning. */
  fixed?: boolean;
  /** Overall opacity of the group. */
  opacity?: number;
}

const WireframeWave = React.forwardRef<SVGSVGElement, WireframeWaveProps>(
  (
    {
      lines = 5,
      color = "currentColor",
      amplitude = 0.6,
      fixed = false,
      opacity = 0.06,
      className,
      ...props
    },
    ref
  ) => {
    const width = 1440;
    const height = 320;
    const centerY = height / 2;
    const amp = 60 * amplitude;
    const spacing = 16;

    const paths = Array.from({ length: lines }, (_, i) => {
      const offset = (i - (lines - 1) / 2) * spacing;
      const y = centerY + offset;
      // Soft S-curve across full width.
      return `M 0 ${y} Q ${width * 0.25} ${y - amp} ${width * 0.5} ${y} T ${width} ${y}`;
    });

    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke={color}
        strokeWidth={1}
        aria-hidden="true"
        className={cn(
          fixed ? "fixed" : "absolute",
          "inset-0 w-full h-full pointer-events-none",
          className
        )}
        style={{ opacity }}
        {...props}
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    );
  }
);
WireframeWave.displayName = "WireframeWave";

/**
 * WaveDivider — horizontal rule decorated with a single wave glyph.
 * Use between sections instead of a hard <hr>.
 */
export interface WaveDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string;
}

const WaveDivider = React.forwardRef<HTMLDivElement, WaveDividerProps>(
  ({ color = "currentColor", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="separator"
        aria-hidden="true"
        className={cn("flex items-center gap-4 text-burgundy/30 py-8", className)}
        {...props}
      >
        <span className="flex-1 h-px bg-current opacity-60" />
        <svg
          width="64"
          height="16"
          viewBox="0 0 64 16"
          fill="none"
          stroke={color}
          strokeWidth={1.25}
          className="text-marigold opacity-80"
        >
          <path d="M 0 8 Q 8 2, 16 8 T 32 8 T 48 8 T 64 8" />
        </svg>
        <span className="flex-1 h-px bg-current opacity-60" />
      </div>
    );
  }
);
WaveDivider.displayName = "WaveDivider";

/**
 * NoteGlyph — small abstract musical note glyph.
 * Use as a bullet marker or iconography flourish. Fine-line art per DESIGN.md.
 */
export interface NoteGlyphProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

const NoteGlyph = React.forwardRef<SVGSVGElement, NoteGlyphProps>(
  ({ size = 16, className, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={cn("inline-block flex-shrink-0", className)}
        {...props}
      >
        <circle cx="4" cy="12" r="2" />
        <path d="M 6 12 V 3 L 13 1.5 V 10" />
        <circle cx="11" cy="10.5" r="2" />
      </svg>
    );
  }
);
NoteGlyph.displayName = "NoteGlyph";

export { WireframeWave, WaveDivider, NoteGlyph };
