"use client"

interface StudioViewerProps {
  sessionId: string
  onPopout: () => void
}

export function StudioViewer({ sessionId, onPopout }: StudioViewerProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="h-11 flex items-center justify-between border-b border-black/[0.06] px-4 glass">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[6px] bg-[#007AFF] flex items-center justify-center">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          </div>
          <span className="text-[13px] font-semibold text-[#1C1C1E]">Remotion Studio</span>
        </div>
        <button type="button" onClick={onPopout} className="text-[12px] font-medium text-[#007AFF] hover:text-[#0071E3] flex items-center gap-1 cursor-pointer">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Popout
        </button>
      </div>
      <div className="flex-1"><iframe src={`/studio-proxy/${sessionId}/`} title="Remotion Studio" className="h-full w-full border-0" allow="autoplay; fullscreen" /></div>
    </div>
  )
}
