---
name: carocut-builder-setup
description: 额外包检测与安装。根据 storyboard 检测并安装额外依赖（lottie/3D/charts/gif 等）。模板和基础依赖已在 bootstrap 阶段完成。
---

# Extra Packages Detection

项目模板和基础依赖已在 bootstrap 阶段完成（`.carocut/template-cache/`）。

本 skill 仅负责：根据 `manifests/storyboard.yaml` 检测并安装**额外包**。

---

## Extra Packages

The template already includes `@remotion/transitions` (4.0.417) as a built-in dependency. **Do not install it as an extra package.**

Based on features in `manifests/storyboard.yaml`, install additional packages:

| Feature Detected | Package | Install Command |
|------------------|---------|-----------------|
| Lottie animations | `@remotion/lottie` | `npm install @remotion/lottie lottie-web` |
| 3D content | `@remotion/three` | `npm install @remotion/three three @react-three/fiber` |
| Charts/Graphs | `recharts` | `npm install recharts` |
| GIF support | `@remotion/gif` | `npm install @remotion/gif` |
| Noise effects | `@remotion/noise` | `npm install @remotion/noise` |
| Light leaks | `@remotion/light-leaks` | `npm install @remotion/light-leaks` |

### Feature Detection

Scan storyboard.yaml for keywords to determine required packages:

| Keywords | Package Needed |
|----------|----------------|
| "lottie", "animation json" | @remotion/lottie |
| "3d", "three", "webgl" | @remotion/three |
| "chart", "graph", "bar", "line", "pie" | recharts |
| "gif" | @remotion/gif |

---

## Workflow

1. Read `manifests/storyboard.yaml`
2. Detect required extra packages based on keywords
3. For each detected package, run `npm install <package>` in `template-project/`
4. Verify with `npx tsc --noEmit`

---

## Verification

After installing extras, verify the project still compiles:

```bash
cd template-project
npx tsc --noEmit
```
