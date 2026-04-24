import { useEffect, useState } from "react";

/**
 * React to a CSS media-query match state.
 *
 * Thin wrapper around `window.matchMedia` that returns the current match
 * state and re-renders the consumer when the match flips (viewport resize,
 * color-scheme change, etc.). Returns `false` on the initial mount before
 * the effect runs — callers should treat that as "unknown / assume desktop".
 *
 * @example
 *   const isMobile = useMediaQuery("(max-width: 768px)");
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
} 