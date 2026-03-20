/**
 * CaroCut Primitives - Pre-built atomic visual capability components.
 *
 * These components provide the building blocks for creating
 * expressive, cinematic video compositions. Each component
 * is fully parametric and handles its own frame calculations.
 *
 * Usage:
 *   import { KenBurns, AnimatedText, SplitScreen } from '../primitives';
 *
 * P0 (Core):
 *   - KenBurns: Pan/zoom on static images (Ken Burns effect)
 *   - AnimatedText: Text animations (typewriter, fade, spring, highlight, counter)
 *   - AnimatedChart: Data viz with growth animations (bar, horizontal-bar, progress-ring)
 *   - Transition: Clip-path/mask-based reveals (circle-wipe, blinds, zoom-fade, etc.)
 *   - BreathingSpace: Visual pause segments (gradients, particles, fade)
 *   - SplitScreen: Multi-panel layouts (horizontal, vertical, picture-in-picture)
 *
 * P1 (Enhanced):
 *   - DynamicBackground: Animated backgrounds (flowing-gradient, mesh, grid, dots, aurora)
 *   - MaskReveal: Geometric mask reveal animations (circle, wipe, diamond, split)
 *   - VideoClip: Video embedding with fade/rate/volume controls
 */

export { KenBurns } from "./KenBurns";
export { AnimatedText } from "./AnimatedText";
export type { AnimatedTextProps } from "./AnimatedText";
export { AnimatedChart } from "./AnimatedChart";
export type { AnimatedChartProps } from "./AnimatedChart";
export { Transition } from "./Transition";
export { BreathingSpace } from "./BreathingSpace";
export { SplitScreen } from "./SplitScreen";
export type { SplitScreenProps } from "./SplitScreen";
export { DynamicBackground } from "./DynamicBackground";
export { MaskReveal } from "./MaskReveal";
export { VideoClip } from "./VideoClip";
