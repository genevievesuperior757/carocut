import { tool } from "@opencode-ai/plugin"
import path from "path"

async function run(cmd: string[]): Promise<string> {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" })
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text()
    const error: any = new Error(stderr.trim() || `Process exited with code ${exitCode}`)
    error.exitCode = exitCode
    error.stderr = stderr
    throw error
  }
  return new Response(proc.stdout).text()
}

export default tool({
  description: `解析 PDF 文档，提取文本、图片和表格内容。
使用 PyMuPDF 和 pdfplumber 进行双引擎解析，产出：
- data.json：结构化的页面内容（文本、图片引用、表格、链接）
- content.txt：纯文本导出
- images/：提取的嵌入图片和表格截图
支持自定义标题检测正则和图表引用正则。
输出目录默认为项目的 raws/ 目录。`,

  args: {
    input_pdf: tool.schema.string().describe("PDF 文件的绝对路径"),
    output_dir: tool.schema.string().describe("输出目录的绝对路径，通常为 <project>/raws"),
    title_patterns: tool.schema.array(tool.schema.string()).optional()
      .describe("额外的标题检测正则表达式列表"),
    ref_patterns: tool.schema.array(tool.schema.string()).optional()
      .describe("额外的图表引用正则表达式列表"),
    text_only: tool.schema.boolean().optional()
      .describe("仅导出纯文本，跳过图片和表格提取，默认 false"),
  },

  async execute(args, context) {
    const script = path.join(context.worktree, ".opencode/scripts/decompose_pdf.py")
    const cmd = ["python3", script, args.input_pdf, args.output_dir]
    if (args.title_patterns) {
      for (const p of args.title_patterns) {
        cmd.push("--title-pattern", p)
      }
    }
    if (args.ref_patterns) {
      for (const p of args.ref_patterns) {
        cmd.push("--ref-pattern", p)
      }
    }
    if (args.text_only) cmd.push("--text-only")
    const result = await run(cmd)
    return result.trim()
  },
})
