---
name: carocut-builder-remotion-ref
description: Remotion API 参考索引。包含 50+ 条 Remotion API 规则的目录索引、关键规则速查表、常用模式代码示例。加载此 skill 获取索引，然后按需 read 具体规则文件。是 carocut-builder-compositor 的伴侣参考。
---

# Remotion Reference

Comprehensive Remotion API reference with best practices. This skill supplements carocut-builder-compositor with detailed API documentation.

**Relationship to other skills:**
- **carocut-builder-compositor:** Implementation patterns, visual standards, project structure
- **carocut-reviewer:** Debugging, preview, render commands
- **This skill:** Remotion API reference, component documentation

---

## Critical Rules (MANDATORY)

| Rule | Implementation | Why |
|------|----------------|-----|
| Frame calculation | Always `Math.round(sec * fps)` | Float frames cause jitter/crashes |
| interpolate safety | `Math.max(duration, 1)` for inputRange | Equal values crash Remotion |
| extrapolate clamp | Always add `extrapolateLeft/Right: 'clamp'` | Prevents values outside range |
| CSS animations | FORBIDDEN | Frame-inaccurate, breaks render |
| Native HTML media | FORBIDDEN - use `<Img>`, `<Audio>`, `<Video>` | Remotion needs asset tracking |
| setTimeout/setInterval | FORBIDDEN | Not frame-synchronized |
| useEffect side effects | FORBIDDEN | Breaks deterministic rendering |

---

## Quick Reference

### Core Hooks

| Hook | Returns | Usage |
|------|---------|-------|
| `useCurrentFrame()` | `number` | Current frame (0-indexed) |
| `useVideoConfig()` | `{ fps, width, height, durationInFrames }` | Video configuration |

### Animation Functions

| Function | Signature | Purpose |
|----------|-----------|---------|
| `interpolate` | `interpolate(frame, inputRange, outputRange, options)` | Linear interpolation |
| `spring` | `spring({ frame, fps, config })` | Physics-based animation |
| `Easing` | `Easing.out(Easing.cubic)` | Easing curves |

### Components

| Component | Props | Purpose |
|-----------|-------|---------|
| `<Sequence>` | `from`, `durationInFrames`, `premountFor` | Time-based children |
| `<Series>` | children | Sequential playback |
| `<AbsoluteFill>` | style | Full-frame container |
| `<Img>` | `src` | Image (use with staticFile) |
| `<Audio>` | `src`, `volume`, `startFrom` | Audio playback |
| `<Video>` | `src`, `startFrom`, `endAt` | Video playback |
| `<OffthreadVideo>` | `src` | Memory-efficient video |

### Utility Functions

| Function | Usage |
|----------|-------|
| `staticFile("path")` | Reference public/ assets |
| `delayRender()` | Pause render until ready |
| `continueRender(handle)` | Resume after delayRender |
| `getInputProps()` | Get CLI input props |

---

## References Directory

Detailed documentation organized by category. Load specific files when needed.

### Core Concepts

| Topic | File | When to Use |
|-------|------|-------------|
| Compositions | `references/compositions.md` | Defining compositions, registerRoot |
| Sequencing | `references/sequencing.md` | Sequence, Series, TransitionSeries |
| Timing | `references/timing.md` | Easing functions, spring config |
| Animations | `references/animations.md` | interpolate patterns, motion |
| Parameters | `references/parameters.md` | Zod schemas, input props |
| Calculate Metadata | `references/calculate-metadata.md` | Dynamic duration/dimensions |

### Media Components

| Topic | File | When to Use |
|-------|------|-------------|
| Images | `references/images.md` | Img component, sizing |
| Videos | `references/videos.md` | Video component, playback |
| Audio | `references/audio.md` | Sound, volume curves, trimming |
| GIFs | `references/gifs.md` | Animated GIF playback |
| Transparent Videos | `references/transparent-videos.md` | Alpha channel, WebM |

### Assets and Resources

| Topic | File | When to Use |
|-------|------|-------------|
| Assets | `references/assets.md` | staticFile, importing |
| Fonts | `references/fonts.md` | Google Fonts, local fonts, @font-face |
| Trimming | `references/trimming.md` | Cut audio/video start/end |

### Text and Typography

| Topic | File | When to Use |
|-------|------|-------------|
| Text Animations | `references/text-animations.md` | Typewriter, word-by-word |
| Measuring Text | `references/measuring-text.md` | Text dimensions, overflow |
| Measuring DOM Nodes | `references/measuring-dom-nodes.md` | Element size calculation |

### Captions and Subtitles

| Topic | File | When to Use |
|-------|------|-------------|
| Subtitles | `references/subtitles.md` | Caption display basics |
| Display Captions | `references/display-captions.md` | Styled caption rendering |
| Import SRT Captions | `references/import-srt-captions.md` | Parse SRT files |
| Transcribe Captions | `references/transcribe-captions.md` | Audio-to-text |

### Visual Effects

| Topic | File | When to Use |
|-------|------|-------------|
| Transitions | `references/transitions.md` | Scene transitions, TransitionSeries |
| Light Leaks | `references/light-leaks.md` | Overlay light effects |
| Lottie | `references/lottie.md` | After Effects animations |

### Data Visualization

| Topic | File | When to Use |
|-------|------|-------------|
| Charts | `references/charts.md` | Recharts integration |
| Maps | `references/maps.md` | Mapbox, geographic data |

### Advanced Features

| Topic | File | When to Use |
|-------|------|-------------|
| 3D | `references/3d.md` | Three.js, React Three Fiber |
| Tailwind | `references/tailwind.md` | Tailwind CSS integration |
| Can Decode | `references/can-decode.md` | Check codec support |
| Extract Frames | `references/extract-frames.md` | Get frames from video |
| Get Video Duration | `references/get-video-duration.md` | Query video length |
| Get Video Dimensions | `references/get-video-dimensions.md` | Query video size |
| Get Audio Duration | `references/get-audio-duration.md` | Query audio length |

---

## Common Patterns

### interpolate with Safety

```typescript
// ALWAYS include clamp options
const opacity = interpolate(
  frame,
  [startFrame, endFrame],
  [0, 1],
  { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
);

// ALWAYS ensure minimum 1-frame duration
const duration = Math.max(secToFrames(text.length * 0.02), 1);
```

### Staggered Entry Animation

```typescript
{items.map((item, index) => {
  const delay = 0.5 + index * 0.12;
  const startFrame = Math.round(delay * fps);
  const endFrame = Math.round((delay + 0.3) * fps);

  const opacity = interpolate(
    frame,
    [startFrame, endFrame],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const translateY = interpolate(
    frame,
    [startFrame, endFrame],
    [20, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div key={index} style={{ opacity, transform: `translateY(${translateY}px)` }}>
      {item}
    </div>
  );
})}
```

### Spring Animation

```typescript
const { fps } = useVideoConfig();
const scale = spring({
  frame,
  fps,
  config: {
    damping: 12,
    stiffness: 100,
    mass: 0.5,
  },
});
```

### BGM with Fade In/Out

```typescript
const { durationInFrames } = useVideoConfig();
const fadeInFrames = 60;  // 2 seconds at 30fps
const fadeOutFrames = 90; // 3 seconds

<Audio
  src={staticFile('audio/bgm/ambient.mp3')}
  volume={(f) => interpolate(
    f,
    [0, fadeInFrames, durationInFrames - fadeOutFrames, durationInFrames],
    [0, 0.15, 0.15, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )}
  loop
/>
```

### Voiceover Positioning

```typescript
// Absolute positioning - NOT nested Sequences
const voStartFrame = computeShotStartFrame('shot_005') + msToFrames(200);

<Sequence from={voStartFrame} durationInFrames={msToFrames(voDuration)}>
  <Audio src={staticFile('audio/vo/VO_005.wav')} />
</Sequence>
```

### TransitionSeries Usage

```typescript
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={CHAPTER1_DURATION}>
    <Chapter1 />
  </TransitionSeries.Sequence>

  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: 15 })}
  />

  <TransitionSeries.Sequence durationInFrames={CHAPTER2_DURATION}>
    <Chapter2 />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

---

## Frame Calculation Utilities

```typescript
import { FPS } from './constants';

// Seconds to frames (always integer)
export function secToFrames(sec: number): number {
  return Math.round(sec * FPS);
}

// Milliseconds to frames (always integer)
export function msToFrames(ms: number): number {
  return Math.round((ms / 1000) * FPS);
}

// Safe duration (minimum 1 frame)
export function safeDuration(frames: number): number {
  return Math.max(frames, 1);
}
```

---

## Error Quick Reference

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `inputRange must be strictly monotonically increasing` | Equal inputRange values | Use `Math.max(duration, 1)` |
| `Could not find composition` | Missing registerRoot | Check Root.tsx exports |
| `staticFile not found` | Wrong path | Path relative to public/, case-sensitive |
| `Render timed out` | delayRender not continued | Call continueRender() |
| White screen in Studio | Component crash | Check DevTools Console |
| WebGL render fails | OpenGL flag | Add renderer flag like`--gl angle-egl` |

---

## Render Commands

All render output MUST go to the `out/` directory so it appears in the resource panel.

```bash
# Test render (first 10 seconds)
npx remotion render MyComposition --frames=0-300 out/test.mp4

# Full render
npx remotion render MyComposition out/output.mp4

# High quality render
npx remotion render MyComposition --crf=15 out/output_hq.mp4

# Low memory render
npx remotion render MyComposition --concurrency=2 --gl=angle out/output.mp4
```

---

## Notes

- This reference supplements carocut-builder-compositor, not replaces it
- For visual standards (fonts, colors, layout), see carocut-builder-compositor
- For debugging workflow, see carocut-reviewer
- Load specific rule files only when implementing that feature
