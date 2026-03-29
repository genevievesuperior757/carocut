# 架构详解

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                   用户界面 (Next.js)                      │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  OpenCode SDK                                            │
│  ┌───────────────────────────────────────────────────┐   │
│  │             carocut-orchestrator (primary)         │   │
│  └───────────────────────┬───────────────────────────┘   │
│           ┌──────────────┼──────────────┐                │
│           ▼              ▼              ▼                │
│     ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│     │ planner  │  │  media   │  │ builder  │            │
│     └──────────┘  └──────────┘  └────┬─────┘            │
│                                      ▼                   │
│                                ┌──────────┐              │
│                                │ reviewer │              │
│                                └──────────┘              │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  工具层: read/write/edit/bash/material/images/audio/project │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  外部服务: Pexels | Pixabay | Caro LLM | Freesound       │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  文件系统: raws/ | manifests/ | template-project/         │
└─────────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16, React 19, Tailwind CSS |
| AI 编排 | OpenCode SDK |
| 视频生成 | Remotion |
| 素材处理 | Python (PyMuPDF, pdfplumber, Pillow) |
| 音视频 | ffmpeg, Edge TTS |

## Agent 设计

### Orchestrator

- **职责**：工作流调度、状态管理、用户沟通、错误恢复
- **不负责**：任何技术实现（全部委托给 subagent）
- **调度协议**：通过 dispatch context 传递项目路径、模式（full/incremental/resume）、已完成步骤、产出物路径

### Planner (Step 0-2)

环境验证 → 素材解析（PDF/图片/文本 → data.json + inventory.yaml） → 策划文档（memo/resources/script/storyboard）

Skills: `carocut-planner-analysis`, `carocut-planner-planning`

### Media (Step 3-5)

脚本润色（去 AI 味） → 图片检索/生成 → TTS/BGM/SFX 生成

Skills: `carocut-media-humanizer`, `carocut-media-visual`, `carocut-media-audio`

### Builder (Step 6-7)

额外包检测 → 资产迁移（resourceMap.ts/constants.ts/timing.ts） → Shot 组件 + Composition 实现

Skills: `carocut-builder-setup`, `carocut-builder-pipeline`, `carocut-builder-compositor`, `carocut-builder-remotion-ref`

### Reviewer (Step 8)

Studio 预览 → 用户反馈迭代 → 最终渲染

Skills: `carocut-reviewer`

## 状态管理

`manifests/progress.yaml` 记录：

```yaml
project:
  path: "/path/to/project"
  created_at: "2025-01-15T10:30:00Z"

decisions:
  video_duration_target: "3min"
  fps: 30
  resolution: "1920x1080"

steps:
  step_0_env_check: { status: "completed" }
  step_1_material_analysis: { status: "completed", artifacts: [...] }
  # ...

amendments: []   # 增量修改记录
revisions: []    # 版本修订记录
```

## 数据流

```
用户素材 → [Planning] PDF解析 → 素材清单 → 四份策划文档
         → [Enhancement] 脚本润色 + 图片检索/生成 + 音频生成
         → [Implementation] Remotion初始化 → 资产迁移 → 组件实现
         → [Delivery] Studio预览 ↔ 用户反馈 → 最终渲染 output.mp4
```

增量修改：Orchestrator 匹配修改类型 → 确定影响链 → 按链调度 subagent → 标记完成

## 设计决策

| 决策 | 原因 | 权衡 |
|------|------|------|
| Multi-Agent 架构 | 职责分离、工具隔离、可扩展、错误隔离 | 调度开销、上下文传递成本 |
| Remotion | React 组件化、逐帧精确控制、TypeScript | 学习曲线、复杂项目渲染慢 |
| YAML 配置 | 人类可读、结构化、支持注释、Git 友好 | 缩进敏感 |
| progress.yaml 状态文件 | 断点续做、状态追踪、增量修改、审计 | 文件锁竞争风险 |

## 扩展点

- **新 Step**：在 orchestrator SKILL.md 定义 → 实现对应 skill → 配置权限
- **新素材类型**：扩展 planner-analysis skill → 更新 inventory.yaml 结构
- **新视觉原语**：在 `template-project/src/primitives/` 添加 → 更新 builder-compositor skill
- **新音频处理**：扩展 media-audio skill → 更新 resources.yaml 结构

## 安全考量

- API 密钥通过环境变量传递，`opencode.json` 在 `.gitignore` 中
- 每个 agent 最小权限原则
- 所有文件操作限制在项目目录内
- subagent 无法访问系统级资源
