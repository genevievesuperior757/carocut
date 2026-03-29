import path from "node:path"
import fs from "node:fs/promises"
import { exec } from "node:child_process"
import { promisify } from "node:util"

const execAsync = promisify(exec)

const WORKSPACE_ROOT = process.cwd()
const BOOTSTRAP_FILE = path.join(WORKSPACE_ROOT, ".carocut", "bootstrap.yaml")

export async function checkBootstrap(): Promise<boolean> {
  try {
    const content = await fs.readFile(BOOTSTRAP_FILE, "utf-8")
    const status = content.match(/status:\s*(\w+)/)?.[1]
    return status === "completed"
  } catch {
    return false
  }
}

export async function runBootstrap(): Promise<{ success: boolean; message: string }> {
  try {
    const script = path.join(WORKSPACE_ROOT, ".opencode/scripts/bootstrap.py")
    const { stdout, stderr } = await execAsync(`python3 "${script}"`, { cwd: WORKSPACE_ROOT })

    // Check if bootstrap succeeded
    const isCompleted = await checkBootstrap()

    if (isCompleted) {
      return {
        success: true,
        message: "环境初始化完成。后续项目将复用此环境。",
      }
    } else {
      return {
        success: false,
        message: stderr || stdout || "环境初始化失败",
      }
    }
  } catch (error: any) {
    return {
      success: false,
      message: `环境初始化失败: ${error.message}`,
    }
  }
}

