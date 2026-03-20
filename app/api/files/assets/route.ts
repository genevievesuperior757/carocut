import { NextRequest } from "next/server"
import path from "node:path"
import fs from "node:fs/promises"
import { getWorkspacePath, workspaceExists } from "@/lib/workspace"

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".json": "application/json",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".txt": "text/plain",
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId")
  const filePath = req.nextUrl.searchParams.get("path")

  if (!sessionId || !filePath) {
    return new Response(JSON.stringify({ error: "Missing sessionId or path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!(await workspaceExists(sessionId))) {
    return new Response(JSON.stringify({ error: "Workspace not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Prevent path traversal
  const normalized = path.normalize(filePath)
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return new Response(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const workspace = getWorkspacePath(sessionId)
  const fullPath = path.join(workspace, normalized)

  // Double-check resolved path is within workspace
  if (!fullPath.startsWith(workspace)) {
    return new Response(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const data = await fs.readFile(fullPath)
    const ext = path.extname(fullPath).toLowerCase()
    const mime = MIME_MAP[ext] || "application/octet-stream"

    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }
}
