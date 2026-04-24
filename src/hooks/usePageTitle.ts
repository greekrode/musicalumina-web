import { useEffect } from 'react';

const BASE_TITLE = 'Musica Lumina';

/**
 * Set `document.title` to `"Musica Lumina | <title>"` while the component
 * is mounted, and restore `"Musica Lumina"` on unmount. Pass a falsy value
 * to render just the base title (used on the homepage).
 *
 * @example
 *   usePageTitle(event?.title ?? "Loading…");
 */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${BASE_TITLE} | ${title}` : BASE_TITLE;
    
    return () => {
      document.title = BASE_TITLE;
    };
  }, [title]);
} 