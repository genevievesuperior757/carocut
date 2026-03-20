# CaroCut 完整指南

环境配置、开发规范、工作流使用、素材规范。

---

## 1. 环境配置

### 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | macOS / Linux（Windows 需用 WSL2） |
| CPU | 2 核（推荐 4 核+） |
| 内存 | 4 GB（推荐 8 GB+） |
| 磁盘 | 10 GB（推荐 20 GB+ SSD） |

### 软件安装

```bash
# Node.js >= 18（推荐 nvm）
nvm install 20 && nvm use 20

# Python >= 3.9
brew install python@3.11       # macOS
# sudo apt-get install python3.11 python3-pip  # Ubuntu

# ffmpeg
brew install ffmpeg             # macOS
# sudo apt-get install ffmpeg   # Ubuntu

# Python 依赖
pip3 install -r requirements.txt
```

Python 依赖包：PyMuPDF（PDF 解析）、pdfplumber（PDF 表格）、requests、Pillow、numpy、edge-tts（旁白生成）。

### API 密钥

| 密钥 | 必需 | 用途 | 获取地址 |
|------|------|------|----------|
| PEXELS_API_KEY | 是 | 图片搜索 | https://www.pexels.com/api/ |
| PIXABAY_API_KEY | 否 | 图片搜索备选 | https://pixabay.com/api/docs/ |
| CARO_LLM_API_KEY | 否 | AI 生图 | 自行提供 OpenAI 兼容 API |
| FREESOUND_API_KEY | 否 | 音效搜索 | https://freesound.org/apiv2/apply/ |

Edge TTS 无需 API Key，安装 Python 依赖即可。

配置方式（推荐环境变量）：

```bash
# 添加到 ~/.zshrc 或 ~/.bashrc
export PEXELS_API_KEY="your_key"
export PIXABAY_API_KEY="your_key"           # 可选
export CARO_LLM_API_KEY="your_key"          # 可选，AI 生图
export CARO_LLM_BASE_URL="https://..."      # 可选，AI 生图 API 地址
export CARO_LLM_MODEL="model-name"          # 可选，AI 生图模型
export FREESOUND_API_KEY="your_key"         # 可选
source ~/.zshrc
```

### 安装与启动

```bash
git clone <repository-url>
cd carocut
pnpm install
cp opencode-template.json opencode.json    # 编辑 provider/apiKey 配置
```

启动需要两个终端：

```bash
# 终端 1：启动 OpenCode 后端
opencode serve --port 4096 --cors http://localhost:3000 --print-logs

# 终端 2：启动前端
pnpm dev                                   # http://localhost:3000
```

### 环境验证

运行 `/carocut` 命令，系统自动执行环境检查（step-0），验证 OS、Node.js、Python、ffmpeg、API 密钥、Python 包。

---

## 2. 项目配置

### opencode.json 结构

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": { "openai": { "options": { "baseURL": "...", "apiKey": "..." } } },
  "model": "openai/gpt-4o",
  "agent": { /* 5 个 Agent 定义 */ },
  "permission": { /* 工具权限 */ },
  "server": { "port": 4096, "cors": ["http://localhost:3000"] }
}
```

配置模板 `opencode-template.json` 提供完整示例。

### Agent 配置

| Agent | 模式 | 职责 | Skill 权限 |
|-------|------|------|-----------|
| carocut-orchestrator | primary | 工作流编排，调度 subagent | carocut-orchestrator |
| carocut-planner | subagent | 环境检查、素材分析、制作策划 | carocut-planner-* |
| carocut-media | subagent | 脚本润色、视觉素材、音频素材 | carocut-media-* |
| carocut-builder | subagent | Remotion 初始化、资产管道、组件实现 | carocut-builder-* |
| carocut-reviewer | subagent | 预览、调试、渲染 | carocut-reviewer, carocut-builder-remotion-ref |

**Orchestrator** 可调度 subagent（task 权限），但不能直接执行 bash、素材处理等。
**Subagent** 有完整文件和 bash 权限，但不能调度其他 agent（task: false）。

---

## 3. 工作流使用

### 启动

```
/carocut
```

系统自动执行 10 步工作流，在关键节点请求用户确认。

### 工作流阶段

```
Setup → Planning → Enhancement → Implementation → Delivery
 (0)     (1, 2)     (3, 4, 5)      (6, 7, 8)       (9)
```

**Step 0 环境检查** — 验证依赖和 API 密钥

**Step 1 素材分析** — 解析 PDF/图片/文本，输出 `raws/data.json` + `raws/inventory.yaml`

**Step 2 制作策划** — 生成四份策划文档：
- `manifests/memo.md`：视频定位、配色、字体、视觉风格
- `manifests/resources.yaml`：所需图片/音频资源定义
- `manifests/script.md`：分段旁白脚本（`[VO_001]` 标记）
- `manifests/storyboard.yaml`：分镜脚本（景别/运镜/节奏/张力/音画关系）

**Step 3 脚本润色** — 去 AI 味，优化语言表达

**Step 4 视觉素材** — 从 Pexels/Pixabay 检索 + AI 生成图片

**Step 5 音频素材** — Edge TTS 旁白、BGM、SFX

**Step 6 Remotion 初始化** — 创建 `template-project/`，安装依赖

**Step 7 资产管道** — 素材迁移到 Remotion 项目，生成 `resourceMap.ts` / `constants.ts` / `timing.ts`

**Step 8 组件实现** — 根据 storyboard 实现 Shot 组件 + Composition

**Step 9 预览渲染** — Remotion Studio 预览 → 用户审查迭代 → 最终渲染 `output.mp4`

### 断点续做

工作流状态保存在 `manifests/progress.yaml`。重新运行 `/carocut` 时自动从中断点继续。

### 增量修改

在任意阶段可提出修改，系统自动识别类型并按影响链调度：

| 修改类型 | 影响步骤 |
|----------|----------|
| add_visual_asset | 4, 7, 8 |
| modify_script_segment | 3, 5, 7, 8 |
| add_new_shot | 2, 4, 5, 7, 8 |
| change_style | 7, 8 |
| replace_bgm | 5, 7, 8 |
| adjust_cinematography | 7, 8 |

---

## 4. 素材规范

### 目录结构

```
raws/
├── images/
│   ├── existing/      # 用户提供
│   ├── retrieved/     # 图库检索
│   └── generated/     # AI 生成
├── audio/
│   ├── vo/            # 旁白 WAV（VO_001.wav, VO_002.wav...）
│   ├── bgm/           # 背景音乐（MP3/WAV）
│   └── sfx/           # 音效（MP3/WAV）
├── data.json          # PDF 解析结果
└── inventory.yaml     # 素材清单
```

### 命名规范

- 使用英文和数字，避免空格和特殊字符
- 图片：描述性名称（`hero-diagram.png`）
- 旁白：`VO_001.wav` 递增编号
- BGM：`bgm-main.mp3`
- SFX：`sfx-transition-whoosh.mp3`

### 策划文档示例

**storyboard.yaml**（关键参数）：

```yaml
shots:
  - id: shot_001
    description: "开场标题卡片"
    duration_ms: 3000
    vo_ids: ["VO_001"]
    framing: "MS"              # ECU/CU/MS/LS/ELS
    camera_movement: "zoom-in" # static/zoom-in/zoom-out/pan-left/pan-right/pan-up/pan-down
    pacing: "medium"
    visual_tension: 0.3        # 0-1
    audio_visual_relation: "sync"  # sync/lead-visual/lead-audio
    transition_in: { type: "fade", duration_ms: 500 }
```

### Remotion 项目输出

```
template-project/
├── public/               # 静态素材
├── src/
│   ├── primitives/       # 预置组件库
│   ├── shots/            # 分镜组件
│   ├── audio/            # 音频层
│   ├── lib/              # resourceMap.ts, constants.ts, timing.ts
│   └── Composition.tsx
└── out/output.mp4        # 最终输出
```

---

## 5. 开发规范

### Skill 开发

在 `.opencode/skills/<name>/SKILL.md` 创建：

```markdown
---
name: skill-name
description: Skill 描述
---
# 功能说明
## 使用规则
## 代码示例
```

### Agent 开发

在 `.opencode/agents/<name>.md` 创建：

```markdown
---
description: Agent 描述
mode: primary | subagent
temperature: 0.2
---
# 角色定义
## 职责范围
## 调度协议
```

### 命令开发

在 `.opencode/commands/<name>.md` 创建。

### 调试

```bash
# 检查端口占用
lsof -i :3000
lsof -i :4096

# 验证 Python 依赖
python3 -c "import fitz; print('PyMuPDF OK')"
python3 -c "from PIL import Image; print('Pillow OK')"

# 验证 ffmpeg
ffmpeg -version && ffprobe -version

# 工作流中断恢复：检查 manifests/progress.yaml
```

### 构建与部署

```bash
pnpm build                          # 构建生产版本
NODE_ENV=production pnpm start      # 启动生产服务器
```

---

## 6. 常见问题

| 问题 | 解决方案 |
|------|----------|
| Node.js 版本过低 | `nvm install 20 && nvm use 20` |
| ffmpeg 未找到 | `brew install ffmpeg`（macOS）/ `apt-get install ffmpeg`（Ubuntu） |
| Python 包导入失败 | `pip3 install -r requirements.txt`，或使用虚拟环境 |
| API 密钥未生效 | `echo $PEXELS_API_KEY` 检查 → `source ~/.zshrc` 重新加载 |
| Remotion Studio 无法启动 | 检查端口占用：`lsof -i :3000` |
| 渲染失败 | 在 `template-project/` 运行 `npm run build` 检查错误 |
| 如何修改已生成视频 | 提出增量修改请求，系统自动更新 |
| 如何更换配音角色 | 修改 `resources.yaml` 中 `character` 字段（如 `zh-CN-XiaoxiaoNeural`） |
| 导出其他格式 | `cd template-project && npx remotion render Composition out/video.webm` |
