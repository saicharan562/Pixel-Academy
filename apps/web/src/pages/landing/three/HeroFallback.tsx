/**
 * Static, GPU-cheap stand-in for the WebGL core — shown when the device lacks
 * WebGL or the user prefers reduced motion. A layered conic/radial "crystal"
 * with a slow spin (auto-frozen by the global reduced-motion guard), so it is a
 * calm gradient orb when motion is off and a gently alive one otherwise.
 */
export function HeroFallback() {
  return (
    <div className="relative grid h-full w-full place-items-center">
      <div className="relative aspect-square w-[70%] max-w-sm">
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full bg-accent/30 blur-3xl" />
        {/* Spinning conic aura */}
        <div
          className="animate-aura-spin absolute inset-2 rounded-full opacity-80 blur-md"
          style={{
            background:
              'conic-gradient(from 0deg, hsl(var(--accent-300)), hsl(var(--accent)), hsl(var(--accent-600)), hsl(var(--accent-200)), hsl(var(--accent-300)))',
          }}
        />
        {/* Glass core */}
        <div className="absolute inset-[14%] rounded-full border border-white/15 bg-gradient-to-br from-white/10 to-transparent backdrop-blur-xl" />
        {/* Specular highlight */}
        <div className="absolute left-[26%] top-[22%] h-1/4 w-1/4 rounded-full bg-white/40 blur-md" />
      </div>
    </div>
  );
}
