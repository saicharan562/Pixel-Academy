import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Central GSAP setup — register ScrollTrigger exactly once, then re-export `gsap`
 * so feature code imports a guaranteed-registered instance.
 */
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
