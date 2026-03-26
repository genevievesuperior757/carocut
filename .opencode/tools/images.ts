import { tool } from "@opencode-ai/plugin"
import path from "path"
import { run, loadEnv } from "./_utils"

export const search = tool({
  description: `在 Pexels 和 Pixabay 搜索免费可商用的库存图片。
支持关键词搜索、颜色筛选、方向筛选、来源选择。
返回 JSON 格式结果，包含图片 URL、尺寸、摄影师信息。
搜索策略：先用英文关键词搜索，如果结果不足则尝试同义词扩展。
需要环境变量：PEXELS_API_KEY（Pexels 源）、PIXABAY_API_KEY（Pixabay 源）。
结果可保存为 JSON 文件供后续处理。`,

  args: {
    query: tool.schema.string().describe("搜索关键词（推荐英文），如 'modern office workspace'"),
    source: tool.schema.enum(["pexels", "pixabay", "both"]).optional()
      .describe("图片来源，默认 pexels"),
    count: tool.schema.number().optional()
      .describe("期望结果数量，默认 3，Pexels 最大 80，Pixabay 最大 200"),
    orientation: tool.schema.enum(["landscape", "portrait", "square", "horizontal", "vertical"]).optional()
      .describe("图片方向，视频制作通常选 landscape"),
    color: tool.schema.string().optional()
      .describe("颜色筛选，如 'blue', 'red', '#ffffff'"),
    page: tool.schema.number().optional()
      .describe("结果页码，默认 1"),
    output: tool.schema.string().optional()
      .describe("保存搜索结果的 JSON 文件绝对路径"),
  },

  async execute(args, context) {
    const env = await loadEnv(context.worktree)
    const script = path.join(context.worktree, ".opencode/scripts/search_images.py")
    const cmd = ["python3", script, "--query", args.query]
    if (args.source) cmd.push("--source", args.source)
    if (args.count) cmd.push("--count", String(args.count))
    if (args.orientation) cmd.push("--orientation", args.orientation)
    if (args.color) cmd.push("--color", args.color)
    if (args.page) cmd.push("--page", String(args.page))
    if (args.output) cmd.push("--output", args.output)
    const result = await run(cmd, { env })
    return result.trim()
  },
})

export const generate = tool({
  description: `通过 OpenAI 兼容 API 生成自定义图片。
用于 storyboard 中无法从库存图片获取的特定场景（如品牌定制插画、特定数据可视化背景）。
支持参考图片输入（URL 或本地路径）和 sprite 模式（生成精灵图序列帧）。
Sprite 模式内置自动验证和重试：生成后检查尺寸是否可被 cols/rows 整除，
失败时自动强化 prompt 重试（最多 max_retries 次）。
生成的图片强制保存为 PNG 格式。
需要环境变量：CARO_LLM_API_KEY、CARO_LLM_BASE_URL、CARO_LLM_MODEL。
注意：生成速度较慢，优先使用 search 获取库存图片。`,

  args: {
    prompt: tool.schema.string()
      .describe("图片生成提示词（英文），需详细描述画面内容、风格、构图"),
    output: tool.schema.string()
      .describe("输出文件的绝对路径（强制 .png 后缀）"),
    reference: tool.schema.array(tool.schema.string()).optional()
      .describe("参考图片路径或 URL 列表"),
    system_prompt: tool.schema.string().optional()
      .describe("覆盖内置的系统提示词"),
    mode: tool.schema.enum(["normal", "sprite"]).optional()
      .describe("生成模式：normal（普通图片）或 sprite（精灵图序列帧），默认 normal"),
    cols: tool.schema.number().optional()
      .describe("精灵图网格列数（仅 sprite 模式，如未指定则从 prompt 自动推断）"),
    rows: tool.schema.number().optional()
      .describe("精灵图网格行数（仅 sprite 模式，如未指定则从 prompt 自动推断）"),
    max_retries: tool.schema.number().optional()
      .describe("sprite 模式最大重试次数，默认 3"),
  },

  async execute(args, context) {
    const env = await loadEnv(context.worktree)
    const script = path.join(context.worktree, ".opencode/scripts/generate_image.py")
    const cmd = ["python3", script, "--prompt", args.prompt, "--output", args.output]
    if (args.reference) {
      for (const ref of args.reference) {
        cmd.push("--reference", ref)
      }
    }
    if (args.system_prompt) cmd.push("--system-prompt", args.system_prompt)
    if (args.mode) cmd.push("--mode", args.mode)
    if (args.cols) cmd.push("--cols", String(args.cols))
    if (args.rows) cmd.push("--rows", String(args.rows))
    if (args.max_retries) cmd.push("--max-retries", String(args.max_retries))
    const result = await run(cmd, { env })
    return result.trim()
  },
})

export const validate_sprite = tool({
  description: `验证精灵图（sprite sheet）是否符合网格规范。
检查：(1) 图片尺寸是否可被 cols/rows 整除，(2) magenta 色度键覆盖率，
(3) 帧间视觉连续性。可选：替换 magenta 为透明通道、提取独立帧文件。
用于 sprite 生成后的质量验证，或手动复核 AI 生成的精灵图。`,

  args: {
    image: tool.schema.string()
      .describe("精灵图文件的绝对路径"),
    cols: tool.schema.number()
      .describe("网格列数"),
    rows: tool.schema.number()
      .describe("网格行数"),
    fix_chroma: tool.schema.boolean().optional()
      .describe("是否将 magenta 背景替换为透明并保存，默认 false"),
    output: tool.schema.string().optional()
      .describe("chroma 修复后的输出路径（仅 fix_chroma=true 时使用）"),
    extract_frames: tool.schema.string().optional()
      .describe("提取独立帧到此目录路径"),
    skip_chroma: tool.schema.boolean().optional()
      .describe("跳过色度键检查（非 magenta 背景的精灵图），默认 false"),
  },

  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/scripts/validate_sprite.py")
    const cmd = ["python3", script, args.image,
      "--cols", String(args.cols), "--rows", String(args.rows)]
    if (args.fix_chroma) cmd.push("--fix-chroma")
    if (args.output) cmd.push("--output", args.output)
    if (args.extract_frames) cmd.push("--extract-frames", args.extract_frames)
    if (args.skip_chroma) cmd.push("--skip-chroma")
    try {
      const result = await run(cmd)
      return result.trim()
    } catch (e: any) {
      // Validation failure returns exit code 1 with JSON output
      return e.stdout?.toString()?.trim() || e.message
    }
  },
})

export const remove_bg = tool({
  description: `移除图片背景，生成透明 PNG。
使用 rembg 库（基于 U2-Net 模型）进行前景分割。
用于需要叠加在视频画面上的前景元素（如人物抠图、产品图）。
输入支持任意图片格式，输出强制为 PNG（保留透明通道）。
需要 Python 包：rembg, Pillow, onnxruntime。`,

  args: {
    input: tool.schema.string().describe("原始图片的绝对路径"),
    output: tool.schema.string().describe("输出 PNG 图片的绝对路径"),
  },

  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/scripts/remove_bg.py")
    const result = await run(["python3", script, args.input, args.output])
    return result.trim()
  },
})
