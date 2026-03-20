import { NextRequest, NextResponse } from "next/server"
import path from "node:path"
import fs from "node:fs/promises"
import { getWorkspacePath, workspaceExists } from "@/lib/workspace"
import type { Artifact, ArtifactType } from "@/lib/types"

const ARTIFACT_DIRS: { subdir: string; type: ArtifactType; mime?: string }[] = [
  { subdir: "outputs", type: "video" },
  { subdir: "template-project/out", type: "video" },
  { subdir: "manifests", type: "manifest", mime: "application/json" },
  { subdir: "raws/images/existing", type: "image" },
  { subdir: "raws/images/retrieved", type: "image" },
  { subdir: "raws/images/generated", type: "image" },
  { subdir: "raws/audio/bgm", type: "audio" },
  { subdir: "raws/audio/sfx", type: "audio" },
  { subdir: "raws/audio/vo", type: "audio" },
]

const IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
}

const AUDIO_MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac",
}

const VIDEO_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
}

const VIDEO_EXTS = new Set(Object.keys(VIDEO_MIME))

function guessMime(type: ArtifactType, ext: string, defaultMime?: string): string | undefined {
  if (defaultMime) return defaultMime
  if (type === "image") return IMAGE_MIME[ext] || "image/png"
  if (type === "audio") return AUDIO_MIME[ext] || "audio/mpeg"
  if (type === "video") return VIDEO_MIME[ext] || "video/mp4"
  return undefined
}

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId")
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    if (!(await workspaceExists(sessionId))) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 })
    }

    const workspace = getWorkspacePath(sessionId)
    const artifacts: Artifact[] = []

    for (const dir of ARTIFACT_DIRS) {
      const fullDir = path.join(workspace, dir.subdir)
      let fileNames: string[]
      try {
        fileNames = await fs.readdir(fullDir)
      } catch {
        continue
      }

      for (const fileName of fileNames) {
        const fullPath = path.join(fullDir, fileName)
        const stat = await fs.stat(fullPath).catch(() => null)
        if (!stat || !stat.isFile()) continue

        const filePath = path.join(dir.subdir, fileName)
        const ext = path.extname(fileName).toLowerCase()

        // For video directories, only include actual video files
        if (dir.type === "video" && !VIDEO_EXTS.has(ext)) continue

        const createdAt = stat.birthtimeMs || stat.mtimeMs

        // JSON files aren't renderable as images/audio; treat them as manifests
        // so the preview panel displays their text content instead.
        const effectiveType: ArtifactType =
          (dir.type === "image" || dir.type === "audio") && ext === ".json"
            ? "manifest"
            : dir.type

        artifacts.push({
          id: `${dir.type}:${filePath}`,
          name: fileName,
          path: filePath,
          type: effectiveType,
          mime: guessMime(effectiveType, ext, dir.mime),
          createdAt,
        })
      }
    }

    // Sort newest first
    artifacts.sort((a, b) => b.createdAt - a.createdAt)

    return NextResponse.json(artifacts)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    )
  }
}
