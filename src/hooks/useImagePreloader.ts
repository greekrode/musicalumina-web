import { useState, useEffect } from 'react';

/**
 * Start downloading an image as soon as its URL is known and report
 * back a combined "still loading" flag.
 *
 * Uses a detached `<img>` to trigger the browser fetch outside the React
 * tree, so consumer layout/animation can stay hidden until the bits are
 * actually in cache. A broken URL still resolves to "loaded" so callers
 * never hang forever.
 *
 * @param imageSrc        — the URL to preload. Empty skips preload.
 * @param existingLoading — an OR-ed external loading flag; if `true` we
 *                          stay in the loading state regardless of image
 *                          progress. Useful when the image depends on
 *                          data that's also still fetching.
 * @returns `true` while loading, `false` once the image is ready or errored.
 */
export function useImagePreloader(imageSrc: string, existingLoading: boolean = false) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!imageSrc) {
      setIsLoaded(true);
      return;
    }

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setIsLoaded(true);
    };
    img.onerror = () => {
      // Even if image fails to load, we should continue
      setIsLoaded(true);
    };

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageSrc]);

  return existingLoading || !isLoaded;
} 