import { useLanguage } from "../lib/LanguageContext";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  /** Adapts colors for dark/inverse surfaces (homepage hero, footer). */
  inverse?: boolean;
  /** Controls sizing — compact for nav, default for drawer/footer. */
  size?: "sm" | "md";
}

/**
 * LanguageSwitcher — Musical Lumina
 *
 * Editorial toggle pair (EN · ID) instead of a single flag + dropdown.
 * Active language marked by marigold underline — same visual grammar used
 * across navigation, links, and page headers. On inverse surfaces (transparent
 * nav over the hero image, or on the burgundy footer) colors invert so the
 * toggle stays legible without losing brand feel.
 *
 * Classes are written as static strings (not dynamic interpolation) so that
 * Tailwind's JIT content scanner picks them up at build time.
 */
function LanguageSwitcher({ inverse = false, size = "sm" }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage();

  const isEn = language === "en";

  // Static class maps — Tailwind needs to see these in source.
  const idleClasses = inverse
    ? "text-offWhite/70 hover:text-offWhite"
    : "text-ink-muted hover:text-burgundy";
  const activeClasses = inverse
    ? "text-offWhite font-semibold"
    : "text-burgundy font-semibold";
  const dividerClasses = inverse ? "text-offWhite/30" : "text-burgundy/25";

  return (
    <div
      role="group"
      aria-label={t("registration.changeLanguage")}
      className={cn(
        "inline-flex items-center gap-0 type-label",
        size === "md" && "text-[13px]"
      )}
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={isEn}
        className={cn(
          "relative px-2.5 py-1 transition-colors duration-fast ease-out-quart rounded-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2",
          isEn ? activeClasses : idleClasses
        )}
      >
        EN
        <span
          aria-hidden
          className={cn(
            "absolute left-2.5 right-2.5 bottom-0 h-[1.5px] bg-marigold transition-transform duration-base ease-out-quart origin-left",
            isEn ? "scale-x-100" : "scale-x-0"
          )}
        />
      </button>
      <span aria-hidden className={cn("mx-0.5 select-none", dividerClasses)}>
        ·
      </span>
      <button
        type="button"
        onClick={() => setLanguage("id")}
        aria-pressed={!isEn}
        className={cn(
          "relative px-2.5 py-1 transition-colors duration-fast ease-out-quart rounded-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold focus-visible:ring-offset-2",
          !isEn ? activeClasses : idleClasses
        )}
      >
        ID
        <span
          aria-hidden
          className={cn(
            "absolute left-2.5 right-2.5 bottom-0 h-[1.5px] bg-marigold transition-transform duration-base ease-out-quart origin-left",
            !isEn ? "scale-x-100" : "scale-x-0"
          )}
        />
      </button>
    </div>
  );
}

export default LanguageSwitcher;
