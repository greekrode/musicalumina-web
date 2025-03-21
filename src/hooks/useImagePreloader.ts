import { useState, useEffect } from 'react';

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