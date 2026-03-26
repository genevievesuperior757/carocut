import { tool } from "@opencode-ai/plugin"
import path from "path"
import { loadEnv, run } from "./_utils"

export default tool({
  description: `爬取指定 URL 的网页内容，提取文本、图片和表格等结构化数据。
用于用户直接提交 URL 作为视频素材来源的场景。
自动下载页面中的图片到本地目录，输出与 PDF 解析兼容的 data.json 和 inventory.yaml。
支持过滤小图片（favicon、tracking pixel 等）。

产出物自动写入 session workspace 的 raws/ 目录：
- {project_path}/raws/data.json
- {project_path}/raws/inventory.yaml
- {project_path}/raws/images/crawled/`,

  args: {
    url: tool.schema.string().describe("目标网页 URL"),
    project_path: tool.schema.string().describe("session workspace 根路径（绝对路径），如 workspaces/ses_xxx/"),
    download_images: tool.schema.boolean().optional()
      .describe("是否下载页面图片，默认 true"),
    max_images: tool.schema.number().optional()
      .describe("最大下载图片数，默认 50"),
    min_image_size: tool.schema.number().optional()
      .describe("最小图片尺寸（像素），默认 100"),
  },

  async execute(args, context) {
    const env = await loadEnv(context.worktree)
    
    const script = path.join(context.worktree, ".opencode/scripts/crawl_url.py")
    const cmd = ["python3", script, args.url, "--project-path", args.project_path]
    if (args.download_images === false) cmd.push("--no-download-images")
    if (args.max_images !== undefined) cmd.push("--max-images", String(args.max_images))
    if (args.min_image_size !== undefined) cmd.push("--min-image-size", String(args.min_image_size))
    const result = await run(cmd, { env })
    return result.trim()
  },
})
