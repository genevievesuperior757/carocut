import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * AnimatedText - Rich text animation primitives.
 *
 * Provides multiple animation modes for text:
 * - typewriter: Characters appear one by one with a cursor
 * - fade-up: Each word/character fades in and slides up with stagger
 * - spring-in: Characters bounce in with spring physics
 * - highlight: Text appears then key words get highlighted
 * - counter: Numeric counting animation
 *
 * @example
 * // Typewriter effect
 * <AnimatedText text="Hello World" mode="typewriter" />
 *
 * // Staggered word fade-in
 * <AnimatedText text="Each word appears" mode="fade-up" unit="word" />
 *
 * // Numeric counter
 * <AnimatedText mode="counter" from={0} to={2136} suffix="个" />
 */

type AnimationUnit = "char" | "word" | "line";

interface AnimatedTextBaseProps {
  /** CSS class name */
  className?: string;
  /** Inline style for the container */
  style?: React.CSSProperties;
  /** Inline style for each animated unit (char/word) */
  unitStyle?: React.CSSProperties;
  /** Delay before animation starts (in seconds) */
  delaySec?: number;
  /** Duration of the full animation (in seconds). Defaults to filling available frames. */
  durationSec?: number;
}

interface TypewriterProps extends AnimatedTextBaseProps {
  mode: "typewriter";
  text: string;
  /** Characters per second. Default: 20 */
  speed?: number;
  /** Show blinking cursor. Default: true */
  showCursor?: boolean;
  /** Cursor character. Default: "|" */
  cursorChar?: string;
}

interface FadeProps extends AnimatedTextBaseProps {
  mode: "fade-up" | "fade-down";
  text: string;
  /** Animate by character or word. Default: "word" */
  unit?: AnimationUnit;
  /** Stagger delay between units in seconds. Default: 0.05 */
  stagger?: number;
  /** Slide distance in pixels. Default: 30 */
  slideDistance?: number;
}

interface SpringInProps extends AnimatedTextBaseProps {
  mode: "spring-in";
  text: string;
  /** Animate by character or word. Default: "char" */
  unit?: AnimationUnit;
  /** Stagger delay between units in seconds. Default: 0.03 */
  stagger?: number;
  /** Spring damping. Default: 12 */
  damping?: number;
}

interface HighlightProps extends AnimatedTextBaseProps {
  mode: "highlight";
  text: string;
  /** Words to highlight (will be matched in the text) */
  highlights: string[];
  /** Highlight color. Default: "#FBBF24" (amber) */
  highlightColor?: string;
  /** Delay before highlight starts after text appears, in seconds. Default: 0.5 */
  highlightDelaySec?: number;
}

interface CounterProps extends AnimatedTextBaseProps {
  mode: "counter";
  /** Start value. Default: 0 */
  from?: number;
  /** End value */
  to: number;
  /** Prefix text */
  prefix?: string;
  /** Suffix text */
  suffix?: string;
  /** Decimal places. Default: 0 */
  decimals?: number;
  /** Use thousands separator. Default: true */
  separator?: boolean;
}

export type AnimatedTextProps =
  | TypewriterProps
  | FadeProps
  | SpringInProps
  | HighlightProps
  | CounterProps;

// ── Typewriter ──────────────────────────────────────────────

const Typewriter: React.FC<TypewriterProps> = ({
  text,
  speed = 20,
  showCursor = true,
  cursorChar = "|",
  delaySec = 0,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const delayFrames = Math.round(delaySec * fps);
  const adjustedFrame = Math.max(0, frame - delayFrames);
  const charsVisible = Math.min(
    text.length,
    Math.floor((adjustedFrame / fps) * speed),
  );

  const visibleText = text.slice(0, charsVisible);
  const cursorOpacity =
    showCursor ? (Math.floor(frame / (fps * 0.5)) % 2 === 0 ? 1 : 0) : 0;

  return (
    <span className={className} style={{ display: "inline", ...style }}>
      {visibleText}
      {showCursor && (
        <span style={{ opacity: cursorOpacity }}>{cursorChar}</span>
      )}
    </span>
  );
};

// ── Fade Up / Down ──────────────────────────────────────────

const FadeDirection: React.FC<FadeProps> = ({
  text,
  mode,
  unit = "word",
  stagger = 0.05,
  slideDistance = 30,
  delaySec = 0,
  style,
  unitStyle,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayFrames = Math.round(delaySec * fps);
  const adjustedFrame = Math.max(0, frame - delayFrames);

  const units = unit === "word" ? text.split(/(\s+)/) : text.split("");
  const staggerFrames = Math.round(stagger * fps);
  const direction = mode === "fade-up" ? 1 : -1;

  return (
    <span
      className={className}
      style={{ display: "inline-flex", flexWrap: "wrap", ...style }}
    >
      {units.map((u, i) => {
        const unitDelay = i * staggerFrames;
        const unitFrame = Math.max(0, adjustedFrame - unitDelay);
        const animDuration = Math.max(1, Math.round(fps * 0.4));

        const opacity = interpolate(unitFrame, [0, animDuration], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const translateY = interpolate(
          unitFrame,
          [0, animDuration],
          [slideDistance * direction, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${translateY}px)`,
              whiteSpace: u.trim() === "" ? "pre" : undefined,
              ...unitStyle,
            }}
          >
            {u}
          </span>
        );
      })}
    </span>
  );
};

// ── Spring In ───────────────────────────────────────────────

const SpringIn: React.FC<SpringInProps> = ({
  text,
  unit = "char",
  stagger = 0.03,
  damping = 12,
  delaySec = 0,
  style,
  unitStyle,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayFrames = Math.round(delaySec * fps);

  const units = unit === "word" ? text.split(/(\s+)/) : text.split("");
  const staggerFrames = Math.round(stagger * fps);

  return (
    <span
      className={className}
      style={{ display: "inline-flex", flexWrap: "wrap", ...style }}
    >
      {units.map((u, i) => {
        const unitDelay = delayFrames + i * staggerFrames;
        const s = spring({
          frame,
          fps,
          delay: unitDelay,
          config: { damping, stiffness: 200, mass: 0.5 },
        });

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: s,
              transform: `scale(${interpolate(s, [0, 1], [0.3, 1])}) translateY(${interpolate(s, [0, 1], [20, 0])}px)`,
              whiteSpace: u.trim() === "" ? "pre" : undefined,
              ...unitStyle,
            }}
          >
            {u}
          </span>
        );
      })}
    </span>
  );
};

// ── Highlight ───────────────────────────────────────────────

const Highlight: React.FC<HighlightProps> = ({
  text,
  highlights,
  highlightColor = "#FBBF24",
  highlightDelaySec = 0.5,
  delaySec = 0,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayFrames = Math.round(delaySec * fps);
  const adjustedFrame = Math.max(0, frame - delayFrames);

  // Text fade-in
  const textOpacity = interpolate(
    adjustedFrame,
    [0, Math.round(fps * 0.3)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Highlight activation
  const highlightDelay = Math.round(highlightDelaySec * fps);
  const highlightFrame = Math.max(0, adjustedFrame - highlightDelay);
  const highlightProgress = interpolate(
    highlightFrame,
    [0, Math.round(fps * 0.4)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  // Build segments with highlight markers
  const pattern = highlights
    .map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const regex = new RegExp(`(${pattern})`, "gi");
  const parts = text.split(regex);

  return (
    <span className={className} style={{ opacity: textOpacity, ...style }}>
      {parts.map((part, i) => {
        const isHighlight = highlights.some(
          (h) => h.toLowerCase() === part.toLowerCase(),
        );
        if (isHighlight) {
          return (
            <span
              key={i}
              style={{
                backgroundImage: `linear-gradient(${highlightColor}, ${highlightColor})`,
                backgroundSize: `${highlightProgress * 100}% 40%`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "0 85%",
                paddingBottom: 2,
              }}
            >
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
};

// ── Counter ─────────────────────────────────────────────────

const Counter: React.FC<CounterProps> = ({
  from = 0,
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  separator = true,
  delaySec = 0,
  durationSec,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const delayFrames = Math.round(delaySec * fps);
  const animFrames = durationSec
    ? Math.round(durationSec * fps)
    : Math.round(durationInFrames * 0.7);

  const adjustedFrame = Math.max(0, frame - delayFrames);

  // Ease-out for satisfying deceleration
  const progress = interpolate(adjustedFrame, [0, animFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eased = 1 - Math.pow(1 - progress, 3);
  const value = from + (to - from) * eased;

  let formatted = value.toFixed(decimals);
  if (separator) {
    const [intPart, decPart] = formatted.split(".");
    const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    formatted = decPart ? `${withSep}.${decPart}` : withSep;
  }

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
};

// ── Main Export ─────────────────────────────────────────────

export const AnimatedText: React.FC<AnimatedTextProps> = (props) => {
  switch (props.mode) {
    case "typewriter":
      return <Typewriter {...props} />;
    case "fade-up":
    case "fade-down":
      return <FadeDirection {...props} />;
    case "spring-in":
      return <SpringIn {...props} />;
    case "highlight":
      return <Highlight {...props} />;
    case "counter":
      return <Counter {...props} />;
  }
};
