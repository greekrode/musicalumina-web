import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop — resets the window scroll position to the top on every
 * pathname change. React Router v6 doesn't do this by default, so
 * navigating from e.g. `/events` (scrolled down) to `/event/:id` would
 * land the user halfway down the new page.
 *
 * Hash-link navigations (`#section-id`) are deliberately skipped so
 * in-page anchors still work. Mount this once, inside <Router>.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    // Instant — a smooth scroll here would race the exit animation and
    // look janky. The page itself is already animating in, so the jump
    // is invisible.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
