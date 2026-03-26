"use client"

import { useMemo } from "react"
import yaml from "js-yaml"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { prism } from "react-syntax-highlighter/dist/esm/styles/prism"

interface YamlViewerProps {
  content: string
}

export function YamlViewer({ content }: YamlViewerProps) {
  const error = useMemo(() => {
    try {
      yaml.load(content)
      return null
    } catch (e) {
      return e instanceof Error ? e.message : "Failed to parse YAML"
    }
  }, [content])

  return (
    <div className="px-5 py-4">
      {error && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-[#FF9500]/8 border border-[#FF9500]/15">
          <svg className="w-4 h-4 text-[#FF9500] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span className="text-[12px] text-[#FF9500]">YAML parse error: {error}</span>
        </div>
      )}
      <SyntaxHighlighter
        language="yaml"
        style={prism}
        customStyle={{ background: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", borderRadius: "12px", padding: "16px", fontSize: "12px" }}
      >
        {content}
      </SyntaxHighlighter>
    </div>
  )
}
