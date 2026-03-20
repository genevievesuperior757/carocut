import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * AnimatedChart - Data visualization with animated reveals.
 *
 * Supports bar charts, horizontal bar charts, and progress rings
 * with growth animations driven by frame interpolation.
 *
 * @example
 * // Animated bar chart
 * <AnimatedChart
 *   type="bar"
 *   data={[
 *     { label: "React", value: 85, color: "#61DAFB" },
 *     { label: "Vue", value: 60, color: "#4FC08D" },
 *     { label: "Angular", value: 45, color: "#DD1B16" },
 *   ]}
 * />
 *
 * // Progress ring
 * <AnimatedChart type="progress-ring" value={0.73} label="完成率" color="#10B981" />
 */

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  type: "bar" | "horizontal-bar";
  data: DataPoint[];
  /** Show value labels on bars. Default: true */
  showValues?: boolean;
  /** Default bar color if not specified per item */
  defaultColor?: string;
  /** Stagger delay between bars in seconds. Default: 0.08 */
  stagger?: number;
  /** Bar border radius. Default: 4 */
  barRadius?: number;
  /** Gap between bars in pixels. Default: 12 */
  gap?: number;
  delaySec?: number;
  style?: React.CSSProperties;
  className?: string;
  /** Label text style */
  labelStyle?: React.CSSProperties;
  /** Value text style */
  valueStyle?: React.CSSProperties;
}

interface ProgressRingProps {
  type: "progress-ring";
  /** Progress value from 0 to 1 */
  value: number;
  /** Display label */
  label?: string;
  /** Ring color */
  color?: string;
  /** Ring track color. Default: "#E5E7EB" */
  trackColor?: string;
  /** Ring size in pixels. Default: 200 */
  size?: number;
  /** Ring stroke width. Default: 12 */
  strokeWidth?: number;
  delaySec?: number;
  style?: React.CSSProperties;
  className?: string;
  /** Label text style */
  labelStyle?: React.CSSProperties;
  /** Value text style */
  valueStyle?: React.CSSProperties;
}

export type AnimatedChartProps = BarChartProps | ProgressRingProps;

// ── Bar Chart ───────────────────────────────────────────────

const BarChart: React.FC<BarChartProps> = ({
  data,
  type,
  showValues = true,
  defaultColor = "#3B82F6",
  stagger = 0.08,
  barRadius = 4,
  gap = 12,
  delaySec = 0,
  style,
  className,
  labelStyle,
  valueStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayFrames = Math.round(delaySec * fps);
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const isHorizontal = type === "horizontal-bar";
  const staggerFrames = Math.round(stagger * fps);
  const growDuration = Math.round(fps * 0.6);

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "column" : "row",
        alignItems: isHorizontal ? "stretch" : "flex-end",
        justifyContent: "center",
        gap,
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      {data.map((item, i) => {
        const itemDelay = delayFrames + i * staggerFrames;
        const itemFrame = Math.max(0, frame - itemDelay);
        const growProgress = interpolate(
          itemFrame,
          [0, growDuration],
          [0, 1],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - growProgress, 3);
        const targetPercent = (item.value / maxValue) * 100;
        const currentPercent = targetPercent * eased;
        const barColor = item.color || defaultColor;

        if (isHorizontal) {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span
                style={{
                  minWidth: 80,
                  textAlign: "right",
                  fontSize: 16,
                  opacity: interpolate(itemFrame, [0, Math.round(fps * 0.2)], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }),
                  ...labelStyle,
                }}
              >
                {item.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 28,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: barRadius,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${currentPercent}%`,
                    height: "100%",
                    background: barColor,
                    borderRadius: barRadius,
                  }}
                />
              </div>
              {showValues && (
                <span
                  style={{
                    minWidth: 40,
                    fontSize: 14,
                    fontVariantNumeric: "tabular-nums",
                    opacity: eased,
                    ...valueStyle,
                  }}
                >
                  {Math.round(item.value * eased)}
                </span>
              )}
            </div>
          );
        }

        // Vertical bar
        return (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              justifyContent: "flex-end",
              height: "100%",
            }}
          >
            {showValues && (
              <span
                style={{
                  fontSize: 14,
                  marginBottom: 4,
                  fontVariantNumeric: "tabular-nums",
                  opacity: eased,
                  ...valueStyle,
                }}
              >
                {Math.round(item.value * eased)}
              </span>
            )}
            <div
              style={{
                width: "100%",
                maxWidth: 60,
                height: `${currentPercent}%`,
                background: barColor,
                borderRadius: `${barRadius}px ${barRadius}px 0 0`,
              }}
            />
            <span
              style={{
                marginTop: 8,
                fontSize: 12,
                textAlign: "center",
                opacity: interpolate(itemFrame, [0, Math.round(fps * 0.2)], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                ...labelStyle,
              }}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ── Progress Ring ───────────────────────────────────────────

const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  label,
  color = "#3B82F6",
  trackColor = "#E5E7EB",
  size = 200,
  strokeWidth = 12,
  delaySec = 0,
  style,
  className,
  labelStyle,
  valueStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delayFrames = Math.round(delaySec * fps);
  const adjustedFrame = Math.max(0, frame - delayFrames);
  const animDuration = Math.round(fps * 1.2);

  const progress = interpolate(adjustedFrame, [0, animDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eased = 1 - Math.pow(1 - progress, 3);
  const currentValue = value * eased;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - currentValue);

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Center value */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: size * 0.2,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            ...valueStyle,
          }}
        >
          {Math.round(currentValue * 100)}%
        </div>
      </div>
      {label && (
        <span style={{ marginTop: 12, fontSize: 16, ...labelStyle }}>
          {label}
        </span>
      )}
    </div>
  );
};

// ── Main Export ─────────────────────────────────────────────

export const AnimatedChart: React.FC<AnimatedChartProps> = (props) => {
  if (props.type === "progress-ring") {
    return <ProgressRing {...props} />;
  }
  return <BarChart {...props} />;
};
