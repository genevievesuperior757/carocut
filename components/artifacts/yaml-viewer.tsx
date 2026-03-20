"use client"

import { useMemo } from "react"
import yaml from "js-yaml"

interface YamlViewerProps {
  content: string
}

export function YamlViewer({ content }: YamlViewerProps) {
  const { parsed, error } = useMemo(() => {
    try {
      const result = yaml.load(content)
      return { parsed: JSON.stringify(result, null, 2), error: null }
    } catch (e) {
      return { parsed: null, error: e instanceof Error ? e.message : "Failed to parse YAML" }
    }
  }, [content])

  if (error || parsed === null) {
    return (
      <div className="px-5 py-4">
        {error && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-[#FF9500]/8 border border-[#FF9500]/15">
            <svg className="w-4 h-4 text-[#FF9500] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span className="text-[12px] text-[#FF9500]">YAML parse error: {error}</span>
          </div>
        )}
        <pre className="overflow-auto whitespace-pre-wrap rounded-xl bg-white border border-black/[0.06] p-4 text-[12px] text-[#3C3C43] font-mono leading-relaxed">{content}</pre>
      </div>
    )
  }

  return (
    <div className="px-5 py-4">
      <pre className="overflow-auto whitespace-pre-wrap rounded-xl bg-white border border-black/[0.06] p-4 text-[12px] text-[#3C3C43] font-mono leading-relaxed">{parsed}</pre>
    </div>
  )
}
