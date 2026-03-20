import { tool } from "@opencode-ai/plugin"
import path from "path"

async function run(cmd: string[], opts?: { cwd?: string }): Promise<string> {
  const proc = Bun.spawn(cmd, { ...opts, stdout: "pipe", stderr: "pipe" })
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    const error: any = new Error(stderr.trim() || `Process exited with code ${exitCode}`)
    error.exitCode = exitCode
    error.stderr = stderr
    error.stdout = await new Response(proc.stdout).text()
    throw error
  }
  return new Response(proc.stdout).text()
}

export default tool({
  description: `验证视频制作所需的系统环境。检查项目包括：
- 操作系统兼容性（macOS/Linux）
- Node.js >= 18.0.0
- Python >= 3.9.0
- ffmpeg 和 ffprobe
- 包管理器（npm/pnpm/bun）
- API 密钥：PEXELS_API_KEY, PIXABAY_API_KEY, CARO_LLM_API_KEY, FREESOUND_API_KEY
- Python 包：PyMuPDF, pdfplumber, requests, edge-tts, Pillow, numpy
返回 JSON 格式的检查结果，包含每项的通过/失败状态和版本信息。
退出码 0 表示全部通过，1 表示有缺失项。`,

  args: {
    quiet: tool.schema.boolean().optional().describe("仅显示错误信息，默认 false"),
  },

  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/scripts/check_env.py")
    const cmd = ["python3", script, "--json"]
    if (args.quiet) cmd.push("--quiet")
    try {
      const result = await run(cmd)
      return result.trim()
    } catch (e: any) {
      return e.stdout?.toString()?.trim() || e.message
    }
  },
})
