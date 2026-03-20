import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * KenBurns - Animated pan/zoom effect on static images.
 *
 * Creates cinematic camera movement on still images by combining
 * scale and translate animations over time.
 *
 * @example
 * // Slow zoom in to center
 * <KenBurns src={staticFile("photo.png")} effect="zoom-in" />
 *
 * // Pan left to right with slight zoom
 * <KenBurns src={staticFile("photo.png")} effect="pan-right" scaleFrom={1.2} scaleTo={1.3} />
 *
 * // Custom start/end positions
 * <KenBurns
 *   src={staticFile("photo.png")}
 *   effect="custom"
 *   from={{ scale: 1.4, x: -10, y: -5 }}
 *   to={{ scale: 1.0, x: 0, y: 0 }}
 * />
 */

type KenBurnsPreset =
  | "zoom-in"
  | "zoom-out"
  | "pan-left"
  | "pan-right"
  | "pan-up"
  | "pan-down"
  | "zoom-in-top-left"
  | "zoom-in-top-right"
  | "zoom-in-bottom-left"
  | "zoom-in-bottom-right"
  | "custom";

interface KenBurnsState {
  scale: number;
  x: number; // percent
  y: number; // percent
}

interface KenBurnsProps {
  /** Image source URL (use staticFile()) */
  src: string;
  /** Preset animation effect */
  effect?: KenBurnsPreset;
  /** Custom start state (only used when effect="custom") */
  from?: KenBurnsState;
  /** Custom end state (only used when effect="custom") */
  to?: KenBurnsState;
  /** Override start scale for preset effects */
  scaleFrom?: number;
  /** Override end scale for preset effects */
  scaleTo?: number;
  /** CSS object-fit for the image */
  objectFit?: "cover" | "contain";
  /** Optional style override for the container */
  style?: React.CSSProperties;
}

const PRESETS: Record<
  Exclude<KenBurnsPreset, "custom">,
  { from: KenBurnsState; to: KenBurnsState }
> = {
  "zoom-in": {
    from: { scale: 1.0, x: 0, y: 0 },
    to: { scale: 1.3, x: 0, y: 0 },
  },
  "zoom-out": {
    from: { scale: 1.3, x: 0, y: 0 },
    to: { scale: 1.0, x: 0, y: 0 },
  },
  "pan-left": {
    from: { scale: 1.2, x: 5, y: 0 },
    to: { scale: 1.2, x: -5, y: 0 },
  },
  "pan-right": {
    from: { scale: 1.2, x: -5, y: 0 },
    to: { scale: 1.2, x: 5, y: 0 },
  },
  "pan-up": {
    from: { scale: 1.2, x: 0, y: 3 },
    to: { scale: 1.2, x: 0, y: -3 },
  },
  "pan-down": {
    from: { scale: 1.2, x: 0, y: -3 },
    to: { scale: 1.2, x: 0, y: 3 },
  },
  "zoom-in-top-left": {
    from: { scale: 1.0, x: 0, y: 0 },
    to: { scale: 1.4, x: -8, y: -6 },
  },
  "zoom-in-top-right": {
    from: { scale: 1.0, x: 0, y: 0 },
    to: { scale: 1.4, x: 8, y: -6 },
  },
  "zoom-in-bottom-left": {
    from: { scale: 1.0, x: 0, y: 0 },
    to: { scale: 1.4, x: -8, y: 6 },
  },
  "zoom-in-bottom-right": {
    from: { scale: 1.0, x: 0, y: 0 },
    to: { scale: 1.4, x: 8, y: 6 },
  },
};

export const KenBurns: React.FC<KenBurnsProps> = ({
  src,
  effect = "zoom-in",
  from: customFrom,
  to: customTo,
  scaleFrom,
  scaleTo,
  objectFit = "cover",
  style,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  let fromState: KenBurnsState;
  let toState: KenBurnsState;

  if (effect === "custom" && customFrom && customTo) {
    fromState = customFrom;
    toState = customTo;
  } else {
    const preset = PRESETS[effect === "custom" ? "zoom-in" : effect];
    fromState = { ...preset.from };
    toState = { ...preset.to };
  }

  // Allow scale overrides on presets
  if (scaleFrom !== undefined) fromState.scale = scaleFrom;
  if (scaleTo !== undefined) toState.scale = scaleTo;

  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Ease-in-out for cinematic feel
  const eased = progress * progress * (3 - 2 * progress);

  const currentScale = interpolate(
    eased,
    [0, 1],
    [fromState.scale, toState.scale],
  );
  const currentX = interpolate(eased, [0, 1], [fromState.x, toState.x]);
  const currentY = interpolate(eased, [0, 1], [fromState.y, toState.y]);

  return (
    <AbsoluteFill style={{ overflow: "hidden", ...style }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit,
          transform: `scale(${currentScale}) translate(${currentX}%, ${currentY}%)`,
          transformOrigin: "center center",
        }}
      />
    </AbsoluteFill>
  );
};
