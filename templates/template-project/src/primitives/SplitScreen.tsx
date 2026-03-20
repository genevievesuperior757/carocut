import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * SplitScreen - Multi-panel layouts for comparison and parallel narratives.
 *
 * Supports side-by-side, top-bottom, and picture-in-picture layouts
 * with animated reveals.
 *
 * @example
 * // Side by side comparison
 * <SplitScreen
 *   layout="horizontal"
 *   left={<Img src={staticFile("before.png")} />}
 *   right={<Img src={staticFile("after.png")} />}
 *   leftLabel="Before"
 *   rightLabel="After"
 * />
 *
 * // Picture in picture
 * <SplitScreen
 *   layout="pip"
 *   main={<Img src={staticFile("main.png")} />}
 *   pip={<Img src={staticFile("detail.png")} />}
 *   pipPosition="bottom-right"
 * />
 */

type PipPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type RevealAnimation = "slide" | "fade" | "none";

interface SplitScreenBaseProps {
  /** Reveal animation. Default: "slide" */
  animation?: RevealAnimation;
  /** Delay before animation starts in seconds */
  delaySec?: number;
  /** Divider line color. Default: "rgba(255,255,255,0.2)" */
  dividerColor?: string;
  /** Divider width in pixels. Default: 2 */
  dividerWidth?: number;
  /** Container style */
  style?: React.CSSProperties;
  className?: string;
}

interface HorizontalSplitProps extends SplitScreenBaseProps {
  layout: "horizontal";
  /** Left panel content */
  left: React.ReactNode;
  /** Right panel content */
  right: React.ReactNode;
  /** Left panel label */
  leftLabel?: string;
  /** Right panel label */
  rightLabel?: string;
  /** Split ratio (0-1). Default: 0.5 */
  ratio?: number;
  /** Label style */
  labelStyle?: React.CSSProperties;
}

interface VerticalSplitProps extends SplitScreenBaseProps {
  layout: "vertical";
  /** Top panel content */
  top: React.ReactNode;
  /** Bottom panel content */
  bottom: React.ReactNode;
  /** Top panel label */
  topLabel?: string;
  /** Bottom panel label */
  bottomLabel?: string;
  /** Split ratio (0-1). Default: 0.5 */
  ratio?: number;
  /** Label style */
  labelStyle?: React.CSSProperties;
}

interface PipProps extends SplitScreenBaseProps {
  layout: "pip";
  /** Main (background) content */
  main: React.ReactNode;
  /** Picture-in-picture content */
  pip: React.ReactNode;
  /** PIP position. Default: "bottom-right" */
  pipPosition?: PipPosition;
  /** PIP size as fraction of canvas width. Default: 0.3 */
  pipScale?: number;
  /** PIP border radius. Default: 12 */
  pipBorderRadius?: number;
}

export type SplitScreenProps =
  | HorizontalSplitProps
  | VerticalSplitProps
  | PipProps;

// ── Horizontal ──────────────────────────────────────────────

const HorizontalSplit: React.FC<HorizontalSplitProps> = ({
  left,
  right,
  leftLabel,
  rightLabel,
  ratio = 0.5,
  animation = "slide",
  delaySec = 0,
  dividerColor = "rgba(255,255,255,0.2)",
  dividerWidth = 2,
  style,
  className,
  labelStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayFrames = Math.round(delaySec * fps);

  const reveal = spring({
    frame,
    fps,
    delay: delayFrames,
    config: { damping: 20, stiffness: 120 },
  });

  const leftTransform =
    animation === "slide"
      ? `translateX(${interpolate(reveal, [0, 1], [-30, 0])}px)`
      : undefined;
  const rightTransform =
    animation === "slide"
      ? `translateX(${interpolate(reveal, [0, 1], [30, 0])}px)`
      : undefined;
  const opacity = animation === "none" ? 1 : reveal;

  const leftWidth = `${ratio * 100}%`;
  const rightWidth = `${(1 - ratio) * 100}%`;

  return (
    <AbsoluteFill className={className} style={{ flexDirection: "row", ...style }}>
      {/* Left */}
      <div
        style={{
          width: leftWidth,
          height: "100%",
          position: "relative",
          overflow: "hidden",
          opacity,
          transform: leftTransform,
        }}
      >
        {left}
        {leftLabel && (
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              padding: "6px 16px",
              background: "rgba(0,0,0,0.6)",
              borderRadius: 6,
              fontSize: 14,
              color: "#fff",
              ...labelStyle,
            }}
          >
            {leftLabel}
          </div>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          width: dividerWidth,
          height: "100%",
          backgroundColor: dividerColor,
          opacity,
        }}
      />

      {/* Right */}
      <div
        style={{
          width: rightWidth,
          height: "100%",
          position: "relative",
          overflow: "hidden",
          opacity,
          transform: rightTransform,
        }}
      >
        {right}
        {rightLabel && (
          <div
            style={{
              position: "absolute",
              bottom: 16,
              right: 16,
              padding: "6px 16px",
              background: "rgba(0,0,0,0.6)",
              borderRadius: 6,
              fontSize: 14,
              color: "#fff",
              ...labelStyle,
            }}
          >
            {rightLabel}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ── Vertical ────────────────────────────────────────────────

const VerticalSplit: React.FC<VerticalSplitProps> = ({
  top,
  bottom,
  topLabel,
  bottomLabel,
  ratio = 0.5,
  animation = "slide",
  delaySec = 0,
  dividerColor = "rgba(255,255,255,0.2)",
  dividerWidth = 2,
  style,
  className,
  labelStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayFrames = Math.round(delaySec * fps);

  const reveal = spring({
    frame,
    fps,
    delay: delayFrames,
    config: { damping: 20, stiffness: 120 },
  });

  const topTransform =
    animation === "slide"
      ? `translateY(${interpolate(reveal, [0, 1], [-20, 0])}px)`
      : undefined;
  const bottomTransform =
    animation === "slide"
      ? `translateY(${interpolate(reveal, [0, 1], [20, 0])}px)`
      : undefined;
  const opacity = animation === "none" ? 1 : reveal;

  return (
    <AbsoluteFill className={className} style={{ flexDirection: "column", ...style }}>
      <div
        style={{
          height: `${ratio * 100}%`,
          width: "100%",
          position: "relative",
          overflow: "hidden",
          opacity,
          transform: topTransform,
        }}
      >
        {top}
        {topLabel && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 16,
              padding: "6px 16px",
              background: "rgba(0,0,0,0.6)",
              borderRadius: 6,
              fontSize: 14,
              color: "#fff",
              ...labelStyle,
            }}
          >
            {topLabel}
          </div>
        )}
      </div>
      <div
        style={{
          height: dividerWidth,
          width: "100%",
          backgroundColor: dividerColor,
          opacity,
        }}
      />
      <div
        style={{
          height: `${(1 - ratio) * 100}%`,
          width: "100%",
          position: "relative",
          overflow: "hidden",
          opacity,
          transform: bottomTransform,
        }}
      >
        {bottom}
        {bottomLabel && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 16,
              padding: "6px 16px",
              background: "rgba(0,0,0,0.6)",
              borderRadius: 6,
              fontSize: 14,
              color: "#fff",
              ...labelStyle,
            }}
          >
            {bottomLabel}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ── Picture in Picture ──────────────────────────────────────

const PictureInPicture: React.FC<PipProps> = ({
  main,
  pip,
  pipPosition = "bottom-right",
  pipScale = 0.3,
  pipBorderRadius = 12,
  animation = "slide",
  delaySec = 0,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const delayFrames = Math.round(delaySec * fps);

  const reveal = spring({
    frame,
    fps,
    delay: delayFrames,
    config: { damping: 15, stiffness: 150 },
  });

  const pipWidth = width * pipScale;
  const pipHeight = height * pipScale;
  const margin = 24;

  const positionMap: Record<PipPosition, { top?: number; bottom?: number; left?: number; right?: number }> = {
    "top-left": { top: margin, left: margin },
    "top-right": { top: margin, right: margin },
    "bottom-left": { bottom: margin, left: margin },
    "bottom-right": { bottom: margin, right: margin },
  };

  const pos = positionMap[pipPosition];
  const opacity = animation === "none" ? 1 : reveal;
  const scale = animation === "slide" ? interpolate(reveal, [0, 1], [0.5, 1]) : 1;

  return (
    <AbsoluteFill className={className} style={style}>
      {main}
      <div
        style={{
          position: "absolute",
          ...pos,
          width: pipWidth,
          height: pipHeight,
          borderRadius: pipBorderRadius,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        {pip}
      </div>
    </AbsoluteFill>
  );
};

// ── Main Export ─────────────────────────────────────────────

export const SplitScreen: React.FC<SplitScreenProps> = (props) => {
  switch (props.layout) {
    case "horizontal":
      return <HorizontalSplit {...props} />;
    case "vertical":
      return <VerticalSplit {...props} />;
    case "pip":
      return <PictureInPicture {...props} />;
  }
};
