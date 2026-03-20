import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * DynamicBackground - Animated background effects.
 *
 * Provides flowing gradients, mesh gradients, noise textures,
 * and geometric patterns as animated backgrounds.
 *
 * @example
 * // Flowing gradient
 * <DynamicBackground
 *   variant="flowing-gradient"
 *   colors={["#667eea", "#764ba2", "#f093fb"]}
 * />
 *
 * // Geometric grid pattern
 * <DynamicBackground variant="grid" color="#ffffff" spacing={60} />
 *
 * // Vignette overlay (use on top of other content)
 * <DynamicBackground variant="vignette" intensity={0.6} />
 */

type BackgroundVariant =
  | "flowing-gradient"
  | "mesh-gradient"
  | "grid"
  | "dots"
  | "vignette"
  | "aurora";

interface DynamicBackgroundProps {
  /** Background variant */
  variant?: BackgroundVariant;
  /** Gradient colors */
  colors?: string[];
  /** Accent/element color */
  color?: string;
  /** Base background color */
  backgroundColor?: string;
  /** Grid/dot spacing in pixels. Default: 40 */
  spacing?: number;
  /** Effect intensity (0-1). Default: 0.5 */
  intensity?: number;
  /** Container style */
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

// ── Flowing Gradient ────────────────────────────────────────

const FlowingGradient: React.FC<{
  colors: string[];
  style?: React.CSSProperties;
}> = ({ colors, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const angle1 = interpolate(frame, [0, durationInFrames], [0, 120], {
    extrapolateRight: "clamp",
  });
  const angle2 = angle1 + 60;

  // Two overlapping rotating gradients
  const c = colors.length >= 3 ? colors : [...colors, colors[0]];
  const bg1 = `linear-gradient(${angle1}deg, ${c[0]} 0%, ${c[1]} 50%, ${c[2] || c[0]} 100%)`;
  const bg2 = `linear-gradient(${angle2}deg, ${c[1]}88 0%, ${c[2] || c[0]}88 100%)`;

  return (
    <AbsoluteFill style={style}>
      <AbsoluteFill style={{ background: bg1 }} />
      <AbsoluteFill
        style={{
          background: bg2,
          mixBlendMode: "overlay",
        }}
      />
    </AbsoluteFill>
  );
};

// ── Mesh Gradient ───────────────────────────────────────────

const MeshGradient: React.FC<{
  colors: string[];
  style?: React.CSSProperties;
}> = ({ colors, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const c = [
    colors[0] || "#667eea",
    colors[1] || "#764ba2",
    colors[2] || "#f093fb",
    colors[3] || "#4facfe",
  ];

  // Four radial gradients with slowly drifting centers
  const blobs = c.map((color, i) => {
    const baseX = 25 + (i % 2) * 50;
    const baseY = 25 + Math.floor(i / 2) * 50;
    const dx = Math.sin(t * 0.3 + i * 1.5) * 15;
    const dy = Math.cos(t * 0.2 + i * 2) * 15;
    return `radial-gradient(circle at ${baseX + dx}% ${baseY + dy}%, ${color} 0%, transparent 50%)`;
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: c[0],
        backgroundImage: blobs.join(", "),
        ...style,
      }}
    />
  );
};

// ── Grid ────────────────────────────────────────────────────

const Grid: React.FC<{
  color: string;
  backgroundColor: string;
  spacing: number;
  intensity: number;
  style?: React.CSSProperties;
}> = ({ color, backgroundColor, spacing, intensity, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Subtle grid drift
  const offset = (frame / fps) * 5;
  const lineOpacity = intensity * 0.3;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        backgroundImage: `
          linear-gradient(${color}${Math.round(lineOpacity * 255).toString(16).padStart(2, "0")} 1px, transparent 1px),
          linear-gradient(90deg, ${color}${Math.round(lineOpacity * 255).toString(16).padStart(2, "0")} 1px, transparent 1px)
        `,
        backgroundSize: `${spacing}px ${spacing}px`,
        backgroundPosition: `${offset}px ${offset}px`,
        ...style,
      }}
    />
  );
};

// ── Dots ────────────────────────────────────────────────────

const Dots: React.FC<{
  color: string;
  backgroundColor: string;
  spacing: number;
  intensity: number;
  style?: React.CSSProperties;
}> = ({ color, backgroundColor, spacing, intensity, style }) => {
  const dotSize = Math.max(2, spacing * 0.06);
  const dotOpacity = intensity * 0.4;

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        backgroundImage: `radial-gradient(${color}${Math.round(dotOpacity * 255).toString(16).padStart(2, "0")} ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${spacing}px ${spacing}px`,
        ...style,
      }}
    />
  );
};

// ── Vignette ────────────────────────────────────────────────

const Vignette: React.FC<{
  intensity: number;
  style?: React.CSSProperties;
}> = ({ intensity, style }) => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${intensity}) 100%)`,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
};

// ── Aurora ───────────────────────────────────────────────────

const Aurora: React.FC<{
  colors: string[];
  backgroundColor: string;
  style?: React.CSSProperties;
}> = ({ colors, backgroundColor, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const c = [
    colors[0] || "#00d2ff",
    colors[1] || "#7b2ff7",
    colors[2] || "#ff0080",
  ];

  // Multiple overlapping sine-wave bands
  const bands = c.map((color, i) => {
    const y = 30 + Math.sin(t * 0.2 + i * 2) * 20;
    const spread = 25 + Math.sin(t * 0.15 + i) * 10;
    return `radial-gradient(ellipse 120% ${spread}% at 50% ${y}%, ${color}66 0%, transparent 100%)`;
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        backgroundImage: bands.join(", "),
        ...style,
      }}
    />
  );
};

// ── Main Export ─────────────────────────────────────────────

export const DynamicBackground: React.FC<DynamicBackgroundProps> = ({
  variant = "flowing-gradient",
  colors = ["#667eea", "#764ba2", "#f093fb"],
  color = "#ffffff",
  backgroundColor = "#0a0a0a",
  spacing = 40,
  intensity = 0.5,
  style,
  className,
  children,
}) => {
  let bg: React.ReactNode;

  switch (variant) {
    case "flowing-gradient":
      bg = <FlowingGradient colors={colors} style={style} />;
      break;
    case "mesh-gradient":
      bg = <MeshGradient colors={colors} style={style} />;
      break;
    case "grid":
      bg = (
        <Grid
          color={color}
          backgroundColor={backgroundColor}
          spacing={spacing}
          intensity={intensity}
          style={style}
        />
      );
      break;
    case "dots":
      bg = (
        <Dots
          color={color}
          backgroundColor={backgroundColor}
          spacing={spacing}
          intensity={intensity}
          style={style}
        />
      );
      break;
    case "vignette":
      bg = <Vignette intensity={intensity} style={style} />;
      break;
    case "aurora":
      bg = <Aurora colors={colors} backgroundColor={backgroundColor} style={style} />;
      break;
  }

  return (
    <AbsoluteFill className={className}>
      {bg}
      {children}
    </AbsoluteFill>
  );
};
