---
name: carocut-builder-pipeline
description: Remotion 资产管道。将 raws/ 素材迁移到 template-project/public/，自动生成 resourceMap.ts、constants.ts、timing.ts 三个 TypeScript 文件。包含生成文件的完整模板和验证检查。
---

# Asset Pipeline

Migrates raw assets to Remotion project and generates TypeScript mappings. Creates the bridge between production planning outputs and implementation code.

## Incremental Mode

New assets copied additively -- existing files in `public/` are not removed. `resourceMap.ts` is fully regenerated to reflect the current complete asset set. `constants.ts` is updated only if style/color changes are specified.

---

## Inputs

| Source | Content |
|--------|---------|
| `raws/images/` | All visual assets |
| `raws/audio/` | VO, BGM, SFX files |
| `raws/videos/` | Video clips (mp4, webm, mov) |
| `manifests/resources.yaml` | Resource definitions |
| `raws/audio/vo/durations.json` | VO timing data |
| `manifests/memo.md` | Color and style preferences |

## Outputs

| Target | Content |
|--------|---------|
| `template-project/public/images/` | Copied image assets |
| `template-project/public/audio/` | Copied audio assets |
| `template-project/public/videos/` | Copied video assets |
| `template-project/src/lib/resourceMap.ts` | Asset path constants |
| `template-project/src/lib/constants.ts` | Colors, fonts, sizes |
| `template-project/src/lib/timing.ts` | Frame calculation utilities |

---

## Generated Files

### resourceMap.ts

```typescript
// Auto-generated - do not edit manually
import { staticFile } from 'remotion';

export const IMAGES = {
  robot: staticFile('images/generated/robot.png'),
  background_tech: staticFile('images/retrieved/tech_bg.jpg'),
  diagram_01: staticFile('images/existing/page_01_img_01.png'),
} as const;

export const VOICEOVER = {
  VO_001: staticFile('audio/vo/VO_001.wav'),
  VO_002: staticFile('audio/vo/VO_002.wav'),
  VO_003: staticFile('audio/vo/VO_003.wav'),
  // ... all VO files
} as const;

export const BGM = {
  background: staticFile('audio/bgm/ambient_loop.mp3'),
} as const;

export const SFX = {
  whoosh: staticFile('audio/sfx/whoosh.mp3'),
  notification: staticFile('audio/sfx/notification.mp3'),
} as const;

export const VIDEO = {
  demo_recording: staticFile('/videos/demo.mp4'),
} as const;

// All durations in milliseconds
export const VO_DURATIONS: Record<keyof typeof VOICEOVER, number> = {
  VO_001: 3200,
  VO_002: 2800,
  VO_003: 4100,
  // ... all VO durations
};
```

### constants.ts

```typescript
// Auto-generated - do not edit manually

export const FPS = 30;
export const RESOLUTION = { width: 1920, height: 1080 };

// Color palette from memo.md
export const COLORS = {
  // Primary palette
  primary: '#2563EB',
  secondary: '#7C3AED',
  accent: '#06B6D4',

  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',

  // Flat backgrounds
  flatGray: '#F8FAFC',
  flatBlue: '#EFF6FF',
  flatGreen: '#ECFDF5',

  // Text hierarchy
  textDark: '#020617',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',

  // Background
  background: '#FFFFFF',
  backgroundDark: '#0F172A',
} as const;

// Font specifications
export const FONTS = {
  title: {
    family: '"Inter", system-ui, sans-serif',
    weight: 700,
    size: 72,
  },
  subtitle: {
    family: '"Inter", system-ui, sans-serif',
    weight: 600,
    size: 48,
  },
  body: {
    family: '"Inter", system-ui, sans-serif',
    weight: 400,
    size: 24,
  },
  code: {
    family: '"JetBrains Mono", monospace',
    weight: 400,
    size: 20,
  },
} as const;

// ── Pacing ──
export const PACING = {
  slow: 0.6,
  medium: 1.0,
  fast: 1.5,
  pause: 0.3,
} as const;

// ── Tension → Animation Config ──
export const TENSION_CONFIG = {
  low: { damping: 25, stiffness: 80 },
  medium: { damping: 15, stiffness: 150 },
  high: { damping: 8, stiffness: 250 },
  extreme: { damping: 5, stiffness: 350 },
} as const;
```

### timing.ts

```typescript
// Frame calculation utilities

import { FPS } from './constants';

/**
 * Convert seconds to frames (always integer)
 */
export function secToFrames(sec: number): number {
  return Math.round(sec * FPS);
}

/**
 * Convert milliseconds to frames (always integer)
 */
export function msToFrames(ms: number): number {
  return Math.round((ms / 1000) * FPS);
}

/**
 * Ensure minimum 1-frame duration to prevent interpolate errors
 */
export function safeDuration(frames: number): number {
  return Math.max(frames, 1);
}

/**
 * Calculate shot duration from voiceover references
 */
export function calculateShotDuration(
  voIds: string[],
  voDurations: Record<string, number>,
  bufferMs: number = 700
): number {
  const totalMs = voIds.reduce((sum, id) => sum + (voDurations[id] || 0), 0);
  return msToFrames(totalMs + bufferMs);
}

/** 根据 pacing 获取动画速度倍率 */
export function pacingMultiplier(pacing: 'slow' | 'medium' | 'fast' | 'pause'): number {
  const map = { slow: 0.6, medium: 1.0, fast: 1.5, pause: 0.3 };
  return map[pacing] ?? 1.0;
}

/** 根据 visual_tension (0-1) 返回 spring config */
export function tensionToSpringConfig(tension: number): { damping: number; stiffness: number } {
  const damping = Math.round(25 - tension * 20);  // 25→5
  const stiffness = Math.round(80 + tension * 270); // 80→350
  return { damping: Math.max(5, damping), stiffness };
}

/** 根据 audio_visual_relation 计算 audio offset (frames) */
export function audioOffsetFrames(
  relation: 'sync' | 'lead-visual' | 'lead-audio' | 'counterpoint',
  fps: number,
  offsetMs?: number,
): number {
  if (relation === 'sync' || relation === 'counterpoint') return 0;
  const defaultMs = relation === 'lead-visual' ? 500 : -300;
  return Math.round((offsetMs ?? defaultMs) / 1000 * fps);
}
```

---

## Verification

After migration, verify the project compiles:

```bash
cd template-project
npx tsc --noEmit
```

### Verification Checks

- [ ] All assets copied to public/
- [ ] resourceMap.ts has no TypeScript errors
- [ ] VO_DURATIONS has entry for every VO file
- [ ] COLORS matches memo.md preferences
- [ ] All staticFile() paths are valid

---

## Manual Asset Copy (if `project_migrate` tool fails)

```bash
# Copy images
cp -r raws/images/* template-project/public/images/

# Copy audio
cp -r raws/audio/* template-project/public/audio/

# Copy videos (if present)
[ -d raws/videos ] && cp -r raws/videos/* template-project/public/videos/
```

Then manually create resourceMap.ts based on the copied files.

---

## User Communication

### Successful Migration

```
资源迁移完成。

复制文件:
  images: 15 个文件 -> template-project/public/images/
  audio: 48 个文件 -> template-project/public/audio/
  videos: 3 个文件 -> template-project/public/videos/

生成文件:
  - src/lib/resourceMap.ts (资源路径映射)
  - src/lib/constants.ts (颜色、字体常量)
  - src/lib/timing.ts (帧计算工具)

类型检查: npx tsc --noEmit 通过

准备进入分镜实现阶段。
```

### Migration with Warnings

```
资源迁移完成 (有警告)。

警告:
  - 3 个资源在 resources.yaml 中定义但文件不存在
    缺失: vis_005, vis_006, vis_007

复制文件: 12 个 (跳过 3 个)

请检查缺失资源或更新 resources.yaml。
```

---

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Missing VO file | TTS generation incomplete | Re-run TTS generation |
| Path mismatch | resources.yaml path wrong | Update path in resources.yaml |
| Type error in resourceMap | Invalid character in key | Use valid TypeScript identifier |
| durations.json missing | extract_durations not run | Run extract_durations.py |

---

## Notes

- All paths in resourceMap.ts use staticFile() for Remotion compatibility
- VO_DURATIONS values are in **milliseconds**
- COLORS are derived from memo.md visual style section
- Do not manually edit generated files - re-run migration if changes needed
- Always run type check after migration to catch path errors
