import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/ML-LogoColor.png";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../lib/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * Navigation — Musical Lumina
 *
 * Fixed-position editorial header. Transparent while the user is at the top
 * of the homepage (so the hero image reads full-bleed), then transitions to a
 * glassmorphic ivory bar once scrolled or on any non-home route.
 *
 * Active route is marked by a marigold underline that animates from the left —
 * the same grammar used in LanguageSwitcher and link hovers, so the whole site
 * speaks one visual language.
 *
 * Mobile: hamburger reveals a full-height drawer with generous spacing, not a
 * compressed accordion dropdown.
 */

interface NavItem {
  path: string;
  labelKey: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { path: "/events", labelKey: "navigation.events" },
  { path: "/about", labelKey: "navigation.about" },
  { path: "/partners", labelKey: "navigation.partners" },
  { path: "/contact", labelKey: "navigation.contact" },
];

function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Lock body scroll while mobile drawer is open.
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const isHomePage = location.pathname === "/";
  const isInverse = isHomePage && !isScrolled;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleNavigation = (path: string) => () => {
    navigate(path);
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav
        aria-label="Primary"
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-base ease-out-quart",
          // Inverse mode (homepage at top): fully transparent — the hero
          // image already carries its own burgundy overlay for text contrast,
          // so a nav gradient creates a visible bottom edge against it.
          isInverse
            ? "bg-transparent border-b border-transparent"
            : "bg-offWhite/85 backdrop-blur-md border-b border-rule-hairline"
        )}
      >
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link
              to="/"
              aria-label="Musical Lumina — home"
              className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold rounded-sm"
            >
              <img
                src={logo}
                alt="Musical Lumina"
                className={cn(
                  "h-10 w-auto transition-[filter] duration-base ease-out-quart",
                  isInverse && "brightness-0 invert"
                )}
              />
            </Link>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center gap-10">
              <ul className="flex items-center gap-8">
                {NAV_ITEMS.map(({ path, labelKey }) => {
                  const active = isActive(path);
                  return (
                    <li key={path}>
                      <button
                        type="button"
                        onClick={handleNavigation(path)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative font-serif text-body-md tracking-[0.01em] py-1.5",
                          "transition-colors duration-fast ease-out-quart",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold rounded-sm",
                          isInverse
                            ? active
                              ? "text-marigold"
                              : "text-offWhite hover:text-marigold"
                            : active
                              ? "text-burgundy"
                              : "text-ink-body hover:text-burgundy"
                        )}
                      >
                        {t(labelKey)}
                        <span
                          aria-hidden
                          className={cn(
                            "absolute inset-x-0 -bottom-0.5 h-[1.5px] bg-marigold origin-left",
                            "transition-transform duration-base ease-out-quart",
                            active ? "scale-x-100" : "scale-x-0"
                          )}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div
                aria-hidden
                className={cn(
                  "h-5 w-px",
                  isInverse ? "bg-offWhite/25" : "bg-burgundy/20"
                )}
              />
              <LanguageSwitcher inverse={isInverse} />
            </div>

            {/* Mobile controls */}
            <div className="md:hidden flex items-center gap-4">
              <LanguageSwitcher inverse={isInverse} />
              <button
                type="button"
                onClick={() => setIsMenuOpen((v) => !v)}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-drawer"
                className={cn(
                  "p-2 rounded-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold",
                  isInverse ? "text-offWhite" : "text-burgundy"
                )}
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer — full-height, outside the nav element for z-index clarity */}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-hidden={!isMenuOpen}
        className={cn(
          "md:hidden fixed inset-0 z-40",
          "transition-[opacity,visibility] duration-base ease-out-quart",
          isMenuOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        )}
      >
        {/* Backdrop */}
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setIsMenuOpen(false)}
          className={cn(
            "absolute inset-0 bg-burgundy/25 backdrop-blur-sm",
            "transition-opacity duration-base ease-out-quart"
          )}
        />
        {/* Panel */}
        <div
          className={cn(
            "absolute top-0 right-0 h-full w-full max-w-sm bg-surface-canvas",
            "border-l border-rule-hairline shadow-none",
            "flex flex-col pt-24 pb-8 px-8",
            "transition-transform duration-slow ease-out-quart",
            isMenuOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <span className="type-label text-ink-accent mb-6 flex items-center gap-3">
            <span aria-hidden className="inline-block h-px w-6 bg-marigold" />
            Menu
          </span>
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ path, labelKey }) => {
              const active = isActive(path);
              return (
                <li key={path}>
                  <button
                    type="button"
                    onClick={handleNavigation(path)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "w-full text-left py-4 font-serif text-headline-sm",
                      "transition-colors duration-fast ease-out-quart",
                      "border-b border-rule-hairline flex items-center justify-between",
                      "focus-visible:outline-none focus-visible:bg-surface-canvas-warm",
                      active
                        ? "text-marigold-700"
                        : "text-burgundy hover:text-marigold-700"
                    )}
                  >
                    <span>{t(labelKey)}</span>
                    <span
                      aria-hidden
                      className={cn(
                        "inline-block h-px transition-all duration-base ease-out-quart",
                        active ? "w-8 bg-marigold" : "w-4 bg-burgundy/20"
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto pt-8">
            <p className="type-caption text-ink-muted">
              Musical Lumina
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Navigation;
