import path from "node:path"
import fs from "node:fs/promises"

const WORKSPACES_ROOT = path.join(process.cwd(), "workspaces")

export async function createWorkspace(sessionId: string): Promise<string> {
  const dir = path.join(WORKSPACES_ROOT, sessionId)
  await fs.mkdir(path.join(dir, "raws", "images", "existing"), { recursive: true })
  await fs.mkdir(path.join(dir, "raws", "images", "retrieved"), { recursive: true })
  await fs.mkdir(path.join(dir, "raws", "images", "generated"), { recursive: true })
  await fs.mkdir(path.join(dir, "raws", "audio", "bgm"), { recursive: true })
  await fs.mkdir(path.join(dir, "raws", "audio", "sfx"), { recursive: true })
  await fs.mkdir(path.join(dir, "raws", "audio", "vo"), { recursive: true })
  await fs.mkdir(path.join(dir, "manifests"), { recursive: true })
  await fs.mkdir(path.join(dir, "outputs"), { recursive: true })
  return dir
}

export function getWorkspacePath(sessionId: string): string {
  return path.join(WORKSPACES_ROOT, sessionId)
}

export async function workspaceExists(sessionId: string): Promise<boolean> {
  try {
    await fs.access(path.join(WORKSPACES_ROOT, sessionId))
    return true
  } catch {
    return false
  }
}

export async function deleteWorkspace(sessionId: string): Promise<void> {
  const dir = path.join(WORKSPACES_ROOT, sessionId)
  await fs.rm(dir, { recursive: true, force: true })
}

export async function listWorkspaceFiles(
  sessionId: string,
  subdir: string,
): Promise<{ name: string; path: string; isDirectory: boolean }[]> {
  const dir = path.join(WORKSPACES_ROOT, sessionId, subdir)
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries.map((e) => ({
      name: e.name,
      path: path.join(subdir, e.name),
      isDirectory: e.isDirectory(),
    }))
  } catch {
    return []
  }
}
