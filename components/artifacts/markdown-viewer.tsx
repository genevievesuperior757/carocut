"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownViewerProps {
  content: string
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
  return (
    <div className="px-5 py-4 prose prose-sm max-w-none prose-headings:text-[#1C1C1E] prose-p:text-[#3C3C43] prose-p:leading-relaxed prose-a:text-[#007AFF] prose-a:no-underline hover:prose-a:underline prose-strong:text-[#1C1C1E] prose-code:rounded-md prose-code:bg-black/[0.04] prose-code:px-1 prose-code:py-0.5 prose-code:text-[#1C1C1E] prose-code:text-[12px] prose-pre:bg-[#F2F2F7] prose-pre:border prose-pre:border-black/[0.06] prose-pre:rounded-xl prose-li:text-[#3C3C43] prose-th:text-[#1C1C1E] prose-td:text-[#3C3C43] prose-hr:border-black/[0.06] prose-blockquote:border-[#E5E5EA] prose-blockquote:text-[#8E8E93]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
