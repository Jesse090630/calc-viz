import { useEffect, useState } from 'react';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function readPrefersReducedMotion(
  matchMedia: ((query: string) => Pick<MediaQueryList, 'matches'>) | undefined =
    typeof window === 'undefined' ? undefined : window.matchMedia.bind(window),
): boolean {
  return matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(readPrefersReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return reduced;
}
