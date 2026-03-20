import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * BreathingSpace - Visual pause segments between content sections.
 *
 * Creates cinematic breathing moments with no narration,
 * using ambient visuals, slow gradients, or gentle particle effects.
 *
 * @example
 * // Gradient breathing space
 * <BreathingSpace variant="gradient" colors={["#1a1a2e", "#16213e", "#0f3460"]} />
 *
 * // Fade to black and back
 * <BreathingSpace variant="fade-black" />
 *
 * // Floating particles
 * <BreathingSpace variant="particles" color="#ffffff" particleCount={30} />
 */

type BreathingVariant = "gradient" | "fade-black" | "fade-white" | "particles" | "radial-pulse";

interface BreathingSpaceProps {
  /** Visual variant */
  variant?: BreathingVariant;
  /** Gradient or accent colors */
  colors?: string[];
  /** Primary color for particles/pulse */
  color?: string;
  /** Background color */
  backgroundColor?: string;
  /** Number of particles (for particles variant). Default: 20 */
  particleCount?: number;
  /** Optional centered text (e.g., chapter title) */
  text?: string;
  /** Text style */
  textStyle?: React.CSSProperties;
  /** Container style */
  style?: React.CSSProperties;
  className?: string;
}

// ── Deterministic pseudo-random ─────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

// ── Gradient ────────────────────────────────────────────────

const GradientBreath: React.FC<{
  colors: string[];
  style?: React.CSSProperties;
}> = ({ colors, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Slowly rotate gradient angle
  const angle = interpolate(frame, [0, durationInFrames], [0, 60], {
    extrapolateRight: "clamp",
  });

  const gradient = `linear-gradient(${angle}deg, ${colors.join(", ")})`;

  return <AbsoluteFill style={{ background: gradient, ...style }} />;
};

// ── Fade to Color ───────────────────────────────────────────

const FadeColor: React.FC<{
  color: string;
  style?: React.CSSProperties;
  backgroundColor?: string;
}> = ({ color, backgroundColor = "transparent", style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade in first half, fade out second half
  const mid = Math.floor(durationInFrames / 2);
  const opacity =
    frame <= mid
      ? interpolate(frame, [0, mid], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : interpolate(frame, [mid, durationInFrames - 1], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  return (
    <AbsoluteFill style={{ backgroundColor, ...style }}>
      <AbsoluteFill style={{ backgroundColor: color, opacity }} />
    </AbsoluteFill>
  );
};

// ── Particles ───────────────────────────────────────────────

const Particles: React.FC<{
  color: string;
  count: number;
  backgroundColor?: string;
  style?: React.CSSProperties;
}> = ({ color, count, backgroundColor = "#0a0a0a", style }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const particles = Array.from({ length: count }, (_, i) => {
    const x = seededRandom(i * 3 + 1) * 100;
    const startY = seededRandom(i * 3 + 2) * 120 + 10;
    const size = seededRandom(i * 3 + 3) * 4 + 2;
    const speed = seededRandom(i * 7) * 0.3 + 0.1;
    const delay = seededRandom(i * 11) * durationInFrames * 0.3;

    const adjustedFrame = Math.max(0, frame - delay);
    const y = startY - adjustedFrame * speed;
    const particleOpacity = interpolate(
      adjustedFrame,
      [0, fps * 0.5, durationInFrames * 0.7, durationInFrames],
      [0, 0.6, 0.6, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    return { x, y, size, opacity: Math.max(0, particleOpacity) };
  });

  return (
    <AbsoluteFill style={{ backgroundColor, overflow: "hidden", ...style }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            backgroundColor: color,
            opacity: p.opacity,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

// ── Radial Pulse ────────────────────────────────────────────

const RadialPulse: React.FC<{
  color: string;
  backgroundColor?: string;
  style?: React.CSSProperties;
}> = ({ color, backgroundColor = "#0a0a0a", style }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Gentle pulsing radial gradient
  const pulse = Math.sin((frame / fps) * Math.PI * 0.5) * 0.15 + 0.2;
  const size = interpolate(frame, [0, durationInFrames], [30, 50], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        background: `radial-gradient(circle at 50% 50%, ${color}${Math.round(pulse * 255).toString(16).padStart(2, "0")} ${size}%, ${backgroundColor} 80%)`,
        ...style,
      }}
    />
  );
};

// ── Main Export ─────────────────────────────────────────────

export const BreathingSpace: React.FC<BreathingSpaceProps> = ({
  variant = "gradient",
  colors = ["#1a1a2e", "#16213e", "#0f3460"],
  color = "#ffffff",
  backgroundColor,
  particleCount = 20,
  text,
  textStyle,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // Optional centered text with fade in/out
  const textOpacity = text
    ? interpolate(
        frame,
        [
          Math.round(fps * 0.3),
          Math.round(fps * 0.8),
          durationInFrames - Math.round(fps * 0.8),
          durationInFrames - Math.round(fps * 0.3),
        ],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      )
    : 0;

  let background: React.ReactNode;
  switch (variant) {
    case "gradient":
      background = <GradientBreath colors={colors} style={style} />;
      break;
    case "fade-black":
      background = <FadeColor color="#000000" backgroundColor={backgroundColor} style={style} />;
      break;
    case "fade-white":
      background = <FadeColor color="#ffffff" backgroundColor={backgroundColor} style={style} />;
      break;
    case "particles":
      background = (
        <Particles
          color={color}
          count={particleCount}
          backgroundColor={backgroundColor}
          style={style}
        />
      );
      break;
    case "radial-pulse":
      background = (
        <RadialPulse color={color} backgroundColor={backgroundColor} style={style} />
      );
      break;
  }

  return (
    <AbsoluteFill className={className}>
      {background}
      {text && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: textOpacity,
          }}
        >
          <span
            style={{
              fontSize: 48,
              fontWeight: 300,
              letterSpacing: 4,
              ...textStyle,
            }}
          >
            {text}
          </span>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
