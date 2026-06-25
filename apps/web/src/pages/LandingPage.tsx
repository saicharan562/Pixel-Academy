import { useEffect } from 'react';
import { useLandingScroll } from './landing/lib/scroll';
import { Nav } from './landing/sections/Nav';
import { Hero } from './landing/sections/Hero';
import { LogoStrip } from './landing/sections/LogoStrip';
import { ProblemSolution } from './landing/sections/ProblemSolution';
import { FeatureShowcase } from './landing/sections/FeatureShowcase';
import { Metrics } from './landing/sections/Metrics';
import { Testimonials } from './landing/sections/Testimonials';
import { Pricing } from './landing/sections/Pricing';
import { FAQ } from './landing/sections/FAQ';
import { FinalCTA } from './landing/sections/FinalCTA';
import { Footer } from './landing/sections/Footer';

/**
 * Pixel Academy — the public storefront at /welcome. A single, cinematic scroll
 * story composed of self-contained sections (src/pages/landing/*). Smooth scroll
 * + GSAP are centralised in useLandingScroll(); every section is reduced-motion
 * and no-WebGL safe, so the page degrades to a calm, fully-static experience.
 */
export function LandingPage() {
  useLandingScroll();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    return () => { document.documentElement.style.scrollBehavior = ''; };
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-bg text-content antialiased">
      {/* Page-wide grain texture */}
      <div className="grain pointer-events-none fixed inset-0 z-[1]" aria-hidden />
      <Nav />
      <main>
        <Hero />
        <LogoStrip />
        <ProblemSolution />
        <FeatureShowcase />
        <Metrics />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
