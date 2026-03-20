import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * VideoClip - Video embedding with playback control and effects.
 *
 * Wraps Remotion's OffthreadVideo with common patterns:
 * fade in/out, playback rate, volume control, cropping.
 *
 * @example
 * // Basic video with fade in/out
 * <VideoClip src={staticFile("demo.mp4")} fadeInSec={0.5} fadeOutSec={0.5} />
 *
 * // Slow motion with volume
 * <VideoClip src={staticFile("clip.mp4")} playbackRate={0.5} volume={0.3} />
 *
 * // Video starting from a specific time
 * <VideoClip src={staticFile("long.mp4")} startFromSec={30} />
 */

interface VideoClipProps {
  /** Video source URL (use staticFile()) */
  src: string;
  /** Playback rate. Default: 1 */
  playbackRate?: number;
  /** Volume (0-1). Default: 1 */
  volume?: number;
  /** Mute audio. Default: false */
  muted?: boolean;
  /** Start playback from this second in the source video */
  startFromSec?: number;
  /** End playback at this second in the source video */
  endAtSec?: number;
  /** Fade in duration in seconds. Default: 0 */
  fadeInSec?: number;
  /** Fade out duration in seconds. Default: 0 */
  fadeOutSec?: number;
  /** CSS object-fit. Default: "cover" */
  objectFit?: "cover" | "contain" | "fill";
  /** Optional overlay color with opacity (e.g., "rgba(0,0,0,0.3)") */
  overlay?: string;
  /** Container style */
  style?: React.CSSProperties;
  className?: string;
}

export const VideoClip: React.FC<VideoClipProps> = ({
  src,
  playbackRate = 1,
  volume = 1,
  muted = false,
  startFromSec,
  endAtSec,
  fadeInSec = 0,
  fadeOutSec = 0,
  objectFit = "cover",
  overlay,
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fade calculations
  const fadeInFrames = Math.round(fadeInSec * fps);
  const fadeOutFrames = Math.round(fadeOutSec * fps);

  let opacity = 1;
  if (fadeInFrames > 0 && frame < fadeInFrames) {
    opacity = interpolate(frame, [0, fadeInFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }
  if (fadeOutFrames > 0 && frame > durationInFrames - fadeOutFrames) {
    opacity = Math.min(
      opacity,
      interpolate(
        frame,
        [durationInFrames - fadeOutFrames, durationInFrames],
        [1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      ),
    );
  }

  // Build startFrom in frames (of the source video at the given playback rate)
  const startFrom = startFromSec ? Math.round(startFromSec * fps) : undefined;
  const endAt = endAtSec ? Math.round(endAtSec * fps) : undefined;

  return (
    <AbsoluteFill
      className={className}
      style={{ opacity, overflow: "hidden", ...style }}
    >
      <OffthreadVideo
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit,
        }}
        playbackRate={playbackRate}
        volume={muted ? 0 : volume}
        startFrom={startFrom}
        endAt={endAt}
      />
      {overlay && (
        <AbsoluteFill
          style={{
            backgroundColor: overlay,
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
