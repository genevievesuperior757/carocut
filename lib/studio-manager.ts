import { spawn, type ChildProcess } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import type { StudioInstance } from "./types"

const IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const IDLE_CHECK_INTERVAL_MS = 60 * 1000 // 60 seconds
const WORKSPACES_ROOT = path.join(process.cwd(), "workspaces")

// Use globalThis to share state across module contexts (custom server vs Next.js bundled API routes).
// Without this, tsx-loaded server.ts and Turbopack-bundled API routes each get their own Map instance.
type InstanceEntry = { process: ChildProcess; info: StudioInstance }

const GLOBAL_KEY = "__carocut_studio_instances__" as const
const PORT_KEY = "__carocut_studio_next_port__" as const

function getInstances(): Map<string, InstanceEntry> {
  if (!(globalThis as Record<string, unknown>)[GLOBAL_KEY]) {
    ;(globalThis as Record<string, unknown>)[GLOBAL_KEY] = new Map<string, InstanceEntry>()
  }
  return (globalThis as Record<string, unknown>)[GLOBAL_KEY] as Map<string, InstanceEntry>
}

function getAndIncrementPort(): number {
  if (!(globalThis as Record<string, unknown>)[PORT_KEY]) {
    ;(globalThis as Record<string, unknown>)[PORT_KEY] = 3100
  }
  const port = (globalThis as Record<string, unknown>)[PORT_KEY] as number
  ;(globalThis as Record<string, unknown>)[PORT_KEY] = port + 1
  return port
}

// --- Condition detection ---

export function isStudioReady(sessionId: string): boolean {
  const projectDir = path.join(WORKSPACES_ROOT, sessionId, "template-project")
  const nodeModules = path.join(projectDir, "node_modules")
  return fs.existsSync(projectDir) && fs.existsSync(nodeModules)
}

// --- Instance access ---

export function getStudioInstance(sessionId: string): StudioInstance | null {
  const entry = getInstances().get(sessionId)
  return entry?.info ?? null
}

export function getAllRunningStudios(): StudioInstance[] {
  const result: StudioInstance[] = []
  for (const [, entry] of getInstances()) {
    if (entry.info.status === "running") {
      result.push(entry.info)
    }
  }
  return result
}

export function touchStudioInstance(sessionId: string): void {
  const entry = getInstances().get(sessionId)
  if (entry) {
    entry.info.lastAccessTime = Date.now()
  }
}

// --- Start / Stop ---

export async function startStudio(sessionId: string, workspacePath: string): Promise<StudioInstance> {
  const instances = getInstances()
  const existing = instances.get(sessionId)
  if (existing && existing.info.status === "running") {
    existing.info.lastAccessTime = Date.now()
    return existing.info
  }

  const port = getAndIncrementPort()
  const projectDir = path.join(workspacePath, "template-project")

  const child = spawn("pnpm", ["dev", "--port", String(port)], {
    cwd: projectDir,
    stdio: "pipe",
    env: { ...process.env, BROWSER: "none" },
  })

  const info: StudioInstance = {
    sessionId,
    port,
    pid: child.pid!,
    status: "starting",
    lastAccessTime: Date.now(),
  }

  instances.set(sessionId, { process: child, info })

  child.stdout?.on("data", (data: Buffer) => {
    const output = data.toString()
    if (output.includes("http://") || output.includes("ready")) {
      info.status = "running"
    }
  })

  child.stderr?.on("data", (data: Buffer) => {
    const output = data.toString()
    if (info.status === "starting") {
      if (output.includes("http://") || output.includes("ready")) {
        info.status = "running"
      }
    }
  })

  child.on("error", (err) => {
    info.status = "error"
    info.error = err.message
  })

  child.on("exit", () => {
    info.status = "stopped"
    getInstances().delete(sessionId)
  })

  // Wait for ready (up to 30s)
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (info.status !== "starting") {
        clearInterval(check)
        resolve()
      }
    }, 500)
    setTimeout(() => {
      clearInterval(check)
      if (info.status === "starting") {
        info.status = "running"
      }
      resolve()
    }, 30000)
  })

  return info
}

export function stopStudio(sessionId: string): void {
  const instances = getInstances()
  const entry = instances.get(sessionId)
  if (entry) {
    entry.process.kill("SIGTERM")
    instances.delete(sessionId)
  }
}

export function stopAllStudios(): void {
  const instances = getInstances()
  for (const [, entry] of instances) {
    entry.process.kill("SIGTERM")
  }
  instances.clear()
}

// --- Idle check timer ---

const idleCheckTimer = setInterval(() => {
  const now = Date.now()
  const instances = getInstances()
  for (const [sessionId, entry] of instances) {
    if (now - entry.info.lastAccessTime > IDLE_TIMEOUT_MS) {
      console.log(`[studio-manager] Stopping idle studio for session ${sessionId}`)
      entry.process.kill("SIGTERM")
      instances.delete(sessionId)
    }
  }
}, IDLE_CHECK_INTERVAL_MS)

// Prevent timer from keeping process alive
idleCheckTimer.unref()

// --- Process cleanup ---

process.on("exit", stopAllStudios)
process.on("SIGINT", () => {
  stopAllStudios()
  process.exit(0)
})
process.on("SIGTERM", () => {
  stopAllStudios()
  process.exit(0)
})
