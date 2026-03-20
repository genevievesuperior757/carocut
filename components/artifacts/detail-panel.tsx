"use client"

import { useEffect, useState } from "react"
import type { Artifact } from "@/lib/types"
import { MarkdownViewer } from "./markdown-viewer"
import { YamlViewer } from "./yaml-viewer"
import { ImageViewer } from "./image-viewer"
import { AudioPlayer } from "./audio-player"
import { VideoPlayer } from "./video-player"
import { StudioViewer } from "./studio-viewer"

interface DetailPanelProps {
  artifact: Artifact | null
  sessionId: string
  showStudio: boolean
}

export function DetailPanel({ artifact, sessionId, showStudio }: DetailPanelProps) {
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTextContent(null); setError(null)
    if (!artifact || artifact.type !== "manifest") return
    let cancelled = false; setLoading(true)
    fetch(`/api/files/assets?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(artifact.path)}`)
      .then((res) => { if (!res.ok) throw new Error(`Failed: ${res.status}`); return res.text() })
      .then((text) => { if (!cancelled) { setTextContent(text); setLoading(false) } })
      .catch((err) => { if (!cancelled) { setError(err instanceof Error ? err.message : "Failed to load"); setLoading(false) } })
    return () => { cancelled = true }
  }, [artifact, sessionId])

  if (showStudio) {
    return <div className="flex h-full flex-col bg-[#F8FAFC]"><StudioViewer sessionId={sessionId} onPopout={() => window.open(`/studio-proxy/${sessionId}/`, "_blank")} /></div>
  }

  if (!artifact) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="w-14 h-14 rounded-xl bg-[#F1F5F9] flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-[#CBD5E1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
        </div>
        <p className="text-base text-[#475569] font-medium">选择素材以预览</p>
      </div>
    )
  }

  const assetUrl = `/api/files/assets?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(artifact.path)}`

  return (
    <div className="flex h-full flex-col bg-[#F8FAFC]">
      <div className="h-14 flex items-center justify-between border-b border-[#E2E8F0] px-6 bg-white">
        <span className="truncate text-base font-semibold text-[#1E293B]">{artifact.name}</span>
        {(artifact.type === "image" || artifact.type === "video") && (
          <a href={assetUrl} download={artifact.type === "video" ? artifact.name : undefined} target={artifact.type === "image" ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1.5 transition-colors duration-150">
            {artifact.type === "video" ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                下载
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                打开
              </>
            )}
          </a>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {artifact.type === "manifest" && (
          <>
            {loading && <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#E2E8F0] border-t-[#2563EB] rounded-full animate-spin" /></div>}
            {error && <div className="flex items-center justify-center py-20"><p className="text-sm text-[#DC2626] font-medium">{error}</p></div>}
            {textContent !== null && !loading && !error && (
              <>
                {artifact.name.endsWith(".md") ? <MarkdownViewer content={textContent} />
                  : artifact.name.endsWith(".yaml") || artifact.name.endsWith(".yml") ? <YamlViewer content={textContent} />
                  : <pre className="overflow-auto whitespace-pre-wrap px-6 py-5 text-sm text-[#1E293B] font-mono leading-relaxed">{textContent}</pre>}
              </>
            )}
          </>
        )}
        {artifact.type === "image" && <ImageViewer key={artifact.id} src={assetUrl} alt={artifact.name} />}
        {artifact.type === "audio" && <AudioPlayer key={artifact.id} src={assetUrl} name={artifact.name} />}
        {artifact.type === "video" && <VideoPlayer key={artifact.id} src={assetUrl} name={artifact.name} />}
      </div>
    </div>
  )
}
