import { lazy, Suspense } from 'react';
import { useRich3D } from '../lib/capabilities.js';

// 3D backdrop is lazy so the WebGL chunk never blocks first paint, and is only
// ever requested when the device supports it and motion is allowed.
const AmbientField = lazy(() =>
  import('../components/three/AmbientField.js').then((m) => ({ default: m.AmbientField })),
);

/**
 * Fixed, app-wide background. Two always-on CSS layers (deep base + calm aurora)
 * provide the full look with zero GPU cost; the subtle live 3D field is layered
 * on top ONLY when WebGL is present and the user hasn't requested reduced motion.
 */
export function ThemeBackground() {
  const rich = useRich3D();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      <div className="animate-aurora-1 absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-accent/12 blur-[130px]" />
      <div className="animate-aurora-2 absolute -right-40 top-24 h-[32rem] w-[32rem] rounded-full bg-info/10 blur-[130px]" />
      <div className="animate-aurora-3 absolute bottom-[-14rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-accent-600/10 blur-[130px]" />

      {rich && (
        <div className="absolute inset-0 opacity-30">
          <Suspense fallback={null}>
            <AmbientField />
          </Suspense>
        </div>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_45%,_hsl(var(--bg)/0.85)_100%)]" />
    </div>
  );
}
