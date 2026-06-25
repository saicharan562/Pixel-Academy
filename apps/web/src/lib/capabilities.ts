import { useEffect, useState } from 'react';

/** One-time, cached WebGL probe — used to decide whether 3D may render at all. */
let cached: boolean | null = null;
export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    cached = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch {
    cached = false;
  }
  return cached;
}

/**
 * True only when rich 3D should run: the device has WebGL AND the user has not
 * asked for reduced motion. Re-evaluates if the OS motion preference changes.
 */
export function useRich3D(): boolean {
  const [allow, setAllow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAllow(hasWebGL() && !mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return allow;
}
