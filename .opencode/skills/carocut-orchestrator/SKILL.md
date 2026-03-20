---
name: carocut-orchestrator
description: 视频制作工作流编排定义。包含完整的工作流阶段映射、dispatch context 模板、状态验证规则、amendment dependency map、以及增量/恢复模式处理流程。
---

# Carocut Orchestrator - Workflow Definitions

## Workflow Phase-Step Mapping

| Phase | Step | Name | Subagent | Description |
|-------|------|------|----------|-------------|
| Setup | step-0 | Environment Check | carocut-planner | Validate system tools, API keys, Python packages |
| Planning | step-1 | Material Analysis | carocut-planner | Parse PDFs, extract images, create inventory |
| Planning | step-2 | Production Planning | carocut-planner | Generate memo, resources, script, storyboard |
| Enhancement | step-3 | Script Humanization | carocut-media | Polish voiceover text, remove AI patterns |
| Enhancement | step-4 | Visual Assets | carocut-media | Retrieve stock images, generate custom images |
| Enhancement | step-5 | Audio Assets | carocut-media | Generate TTS voiceovers, retrieve BGM and SFX |
| Implementation | step-6 | Remotion Setup | carocut-builder | Initialize Remotion project from template |
| Implementation | step-7 | Asset Pipeline | carocut-builder | Migrate assets, generate TypeScript resource maps |
| Implementation | step-8 | Shot Compositor | carocut-builder | Implement shot components with Remotion |
| Delivery | step-9 | Preview and Render | carocut-reviewer | Preview, iterate, debug, and render final video |

---

## Dispatch Context Template

Orchestrator must pass this structured context when dispatching each subagent via Task tool:

```yaml
dispatch_context:
  project_path: "/absolute/path/to/project"
  mode: "full"                    # "full" | "incremental" | "resume"
  current_phase: "planning"       # setup | planning | enhancement | implementation | delivery
  completed_steps: [0, 1]

  artifacts:
    memo: "manifests/memo.md"
    resources: "manifests/resources.yaml"
    script: "manifests/script.md"
    storyboard: "manifests/storyboard.yaml"    # 包含 framing/camera_movement/pacing/visual_tension/audio_visual_relation/transition_in/breathing 等电影感字段，subagent 应读取并使用
    inventory: "raws/inventory.yaml"
    data_json: "raws/data.json"

  output_rules: |
    [CRITICAL] 所有文件必须写入以下固定路径，禁止修改文件名或创建新目录：
    - memo 写入: {project_path}/manifests/memo.md
    - resources 写入: {project_path}/manifests/resources.yaml
    - script 写入: {project_path}/manifests/script.md
    - storyboard 写入: {project_path}/manifests/storyboard.yaml
    - inventory 写入: {project_path}/raws/inventory.yaml
    - data 写入: {project_path}/raws/data.json
    - VO 音频写入: {project_path}/raws/audio/vo/
    - BGM 写入: {project_path}/raws/audio/bgm/
    - SFX 写入: {project_path}/raws/audio/sfx/
    - 检索图片写入: {project_path}/raws/images/retrieved/
    - 生成图片写入: {project_path}/raws/images/generated/
    禁止在 project_path 下创建 manifests/ raws/ outputs/ template-project/ 以外的顶级目录。

  decisions_summary: |
    - 视频时长目标：3分钟
    - FPS：30
    - 分辨率：1920x1080
    - 总 shot 数：12
    - VO 段落数：8
    - 视觉风格：扁平插画 + 渐变背景
    - 配色方案：#0F172A 主色 + #3B82F6 强调色
```

Design principles:
- **Paths not content**: Avoid copying large files into dispatch context
- **Decisions summary**: Orchestrator extracts key numeric values and decisions so downstream agents do not need to re-interpret all upstream artifacts
- **completed_steps**: Serves as the basis for resume-from-checkpoint
- **output_rules is mandatory**: Every dispatch MUST include `output_rules` with `{project_path}` replaced by the actual absolute path

---

## Step Completion Checklist

For each step, verify these files/directories exist to confirm completion:

| Step | Completion Artifacts |
|------|---------------------|
| step-0 | env check passed (exit code 0) |
| step-1 | `raws/data.json`, `raws/inventory.yaml`, `raws/images/existing/` |
| step-2 | `manifests/memo.md`, `manifests/resources.yaml`, `manifests/script.md`, `manifests/storyboard.yaml` |
| step-3 | `manifests/script.md` (modified, AI patterns removed) |
| step-4 | `raws/images/retrieved/`, `raws/images/generated/` |
| step-5 | `raws/audio/vo/*.wav`, `raws/audio/vo/durations.json`, `raws/audio/bgm/`, `raws/audio/sfx/` |
| step-6 | `template-project/package.json`, `template-project/node_modules/` |
| step-7 | `template-project/public/`, `template-project/src/lib/resourceMap.ts`, `template-project/src/lib/constants.ts`, `template-project/src/lib/timing.ts` |
| step-8 | `template-project/src/shots/`, `template-project/src/Composition.tsx`, `npm run build` succeeds |
| step-9 | `template-project/out/output.mp4` |

---

## Amendment Dependency Map

When users request changes after initial completion, use this map to determine which steps must re-execute:

```yaml
amendment_dependencies:
  add_visual_asset:
    - { step: 4, mode: incremental, action: "获取指定的新素材" }
    - { step: 7, mode: incremental, action: "迁移新素材，更新 resourceMap.ts" }
    - { step: 8, mode: incremental, action: "修改受影响的 shot 组件" }

  modify_script_segment:
    - { step: 3, mode: incremental, action: "仅对修改段落去 AI 味" }
    - { step: 5, mode: incremental, action: "重新生成受影响的 VO" }
    - { step: 7, mode: incremental, action: "迁移新 VO，更新 resourceMap" }
    - { step: 8, mode: incremental, action: "更新受影响 shot 的帧时序" }

  add_new_shot:
    - { step: 2, mode: incremental, action: "storyboard.yaml 追加 shot" }
    - { step: 4, mode: incremental, action: "获取新 shot 所需视觉素材" }
    - { step: 5, mode: incremental, action: "生成新 shot 的 VO" }
    - { step: 7, mode: incremental, action: "迁移新素材，更新 resourceMap" }
    - { step: 8, mode: incremental, action: "实现新 shot 组件" }

  change_style:
    - { step: 7, mode: incremental, action: "更新 constants.ts 配色和字体" }
    - { step: 8, mode: full_rescan, action: "扫描所有 shot，更新硬编码值" }

  replace_bgm:
    - { step: 5, mode: incremental, action: "获取新 BGM" }
    - { step: 7, mode: incremental, action: "迁移新 BGM，更新 resourceMap" }
    - { step: 8, mode: incremental, action: "更新 BackgroundMusicLayer" }

  adjust_cinematography:
    - { step: 7, mode: incremental, action: "更新 pipeline 中的运镜/景别/转场参数" }
    - { step: 8, mode: incremental, action: "重新编排受影响 shot 的 primitives 和动画" }

  modify_pacing:
    - { step: 2, mode: incremental, action: "更新 storyboard 中的节奏结构和呼吸段" }
    - { step: 7, mode: incremental, action: "更新 timing.ts 中的节奏参数" }
    - { step: 8, mode: incremental, action: "重新编排 shot 时长和转场节奏" }

  add_breathing_space:
    - { step: 2, mode: incremental, action: "在 storyboard 中插入 breathing 段落" }
    - { step: 7, mode: incremental, action: "更新 timing.ts 和 resourceMap" }
    - { step: 8, mode: incremental, action: "实现 BreathingSpace 组件并调整时序" }

  change_camera_movement:
    - { step: 8, mode: incremental, action: "修改受影响 shot 的 KenBurns/运镜 primitive 参数" }

  add_video_asset:
    - { step: 4, mode: incremental, action: "获取指定的视频素材" }
    - { step: 7, mode: incremental, action: "迁移视频素材，更新 resourceMap" }
    - { step: 8, mode: incremental, action: "使用 VideoClip primitive 实现视频 shot" }

  adjust_tension_curve:
    - { step: 2, mode: incremental, action: "调整 storyboard 中的 visual_tension 曲线" }
    - { step: 8, mode: incremental, action: "根据新的张力曲线调整 shot 节奏和视觉强度" }
```

---

## Progress.yaml Structure

Orchestrator maintains this persistent state file at `manifests/progress.yaml`:

```yaml
project:
  path: "/Users/xxx/Desktop/my-video-project"
  created_at: "2025-06-15T10:30:00Z"
  updated_at: "2025-06-15T14:22:00Z"

decisions:
  video_duration_target: "3min"
  fps: 30
  resolution: "1920x1080"
  total_shots: 12
  total_vo_segments: 8
  visual_style: "扁平插画 + 渐变背景"
  color_primary: "#0F172A"
  color_accent: "#3B82F6"
  font_family: "Noto Sans SC"
  voice_model: "zh-CN-XiaoxiaoNeural"
  voice_speed_factor: 1.2
  bgm_style: "轻快科技感"

steps:
  step_0_env_check:
    status: "completed"          # pending | in_progress | completed | failed
    completed_at: "2025-06-15T10:35:00Z"
    summary: "所有依赖已验证"
  step_1_material_analysis:
    status: "completed"
    completed_at: "2025-06-15T10:52:00Z"
    summary: "PDF 解析完成"
    artifacts:
      - "raws/data.json"
      - "raws/inventory.yaml"
      - "raws/images/existing/"
  # ... remaining steps follow same pattern ...

amendments: []
revisions: []
```

---

## Incremental and Resume Mode Processing

### Incremental Mode (Amendment)

```
用户在任意阶段提出新需求
  |-- 1. 匹配 amendment_dependencies 中的变更类型
  |     |-- 匹配到已知类型 -> 使用预定义影响链
  |     +-- 未匹配 -> 自行推理影响范围
  |-- 2. 生成 amendment 记录，写入 progress.yaml
  |-- 3. 按影响链顺序，逐个调度受影响 subagent（incremental 模式）
  |-- 4. 全部完成后标记 amendment 为 completed
  +-- 5. 如果已在 preview 阶段，自动重新调度 reviewer
```

### Resume Mode (Interrupted Session)

```
用户中断后重新启动
  |-- orchestrator 读取 progress.yaml
  |-- 发现某 step 状态为 "in_progress"
  |-- 检查该 step 的预期产出物：哪些存在、哪些缺失
  |-- 构造 resume dispatch context（mode: "resume"）
  +-- 调度 subagent 从断点继续
```

---

## User Communication Templates

Phase completion messages (Chinese):

```
# Setup Phase Complete
环境检查完成，所有依赖已验证。准备进入素材分析阶段。

# Planning Phase Complete
策划阶段完成。四份策划文档已生成并经确认:
  - manifests/memo.md
  - manifests/resources.yaml
  - manifests/script.md
  - manifests/storyboard.yaml
准备进入资源获取阶段。

# Enhancement Phase Complete
资源获取完成。
  视觉素材: X 张图片
  音频素材: X 段语音 + BGM + SFX
准备进入工程实现阶段。

# Implementation Phase Complete
工程实现完成。所有分镜已实现，构建成功。
准备进入预览与渲染阶段。

# Delivery Complete
视频渲染完成。
  输出文件: template-project/out/output.mp4
```

---

## Legacy Project Migration

如果项目是在电影感升级之前创建的（storyboard.yaml 缺少 framing/camera_movement/pacing/visual_tension/audio_visual_relation/transition_in/breathing 字段）：

1. **推荐**：重新运行 step-2（Planner Planning）以重新生成完整的 storyboard.yaml
2. **手动补全**：在现有 storyboard.yaml 中为每个 shot 添加缺失字段，使用默认值：
   ```yaml
   framing: "MS"
   camera_movement: "static"
   pacing: "medium"
   visual_tension: 0.5
   audio_visual_relation: "sync"
   transition_in:
     type: "fade"
     duration_ms: 500
   breathing: false
   ```
3. 补全后需要重新执行 step-7（Pipeline）和 step-8（Compositor）
