import path from "path"

export async function loadEnv(worktree: string): Promise<Record<string, string>> {
  const envPath = path.join(worktree, ".env")
  const file = Bun.file(envPath)
  if (!(await file.exists())) return {}
  const text = await file.text()
  const env: Record<string, string> = {}
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const idx = trimmed.indexOf("=")
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
    env[key] = val
  }
  return env
}

export async function run(
  cmd: string[],
  opts?: { cwd?: string; env?: Record<string, string> },
): Promise<string> {
  const proc = Bun.spawn(cmd, {
    ...opts,
    env: { ...process.env, ...opts?.env },
    stdout: "pipe",
    stderr: "pipe",
  })
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
