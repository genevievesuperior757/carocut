"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/hooks/use-session"
import { Logo, LogoIcon } from "@/components/ui/logo"

export default function HomePage() {
  const router = useRouter()
  const { sessions, loading, fetchSessions, createSession, updateSession, deleteSession } = useSession()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleCreate = async () => {
    const { session, error } = await createSession("New Video Project")
    if (error) { setErrorMsg(error); return }
    if (!session) return
    router.push(`/session/${session.id}`)
  }

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditValue(currentTitle || "")
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const commitEdit = async () => {
    if (!editingId) return
    const trimmed = editValue.trim()
    if (trimmed) {
      const { error } = await updateSession(editingId, trimmed)
      if (error) setErrorMsg(error)
    }
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <header className="h-14 px-6 flex items-center justify-between bg-white border-b border-[#E2E8F0]">
        <Logo size="md" />
        <button
          onClick={handleCreate}
          className="h-9 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          新建项目
        </button>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {errorMsg && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#DC2626]">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            <span className="flex-1">{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-[#DC2626] hover:text-[#B91C1C] cursor-pointer">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-[#475569] uppercase tracking-wide">项目列表</h2>
          <span className="text-sm text-[#94A3B8] font-medium">{sessions.length}</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-[#E2E8F0] border-t-[#2563EB] rounded-full animate-spin" />
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-[#E2E8F0]">
            <div className="w-14 h-14 rounded-xl bg-[#F1F5F9] flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-[#94A3B8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <p className="text-base text-[#475569] font-medium mb-2">暂无项目</p>
            <p className="text-sm text-[#94A3B8] mb-4">创建您的第一个视频项目</p>
            <button onClick={handleCreate} className="text-sm text-[#2563EB] hover:text-[#1D4ED8] font-medium cursor-pointer transition-colors duration-150">
              创建项目 →
            </button>
          </div>
        )}

        <div className="rounded-xl overflow-hidden bg-white border border-[#E2E8F0]">
          {sessions.map((s, i) => (
            <div
              key={s.id}
              className={`group flex items-center justify-between px-5 py-4 cursor-pointer transition-colors duration-150 hover:bg-[#F8FAFC] ${i > 0 ? "border-t border-[#E2E8F0]" : ""}`}
              onClick={() => { if (editingId !== s.id) router.push(`/session/${s.id}`) }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <LogoIcon size="lg" />
                <div className="min-w-0">
                  {editingId === s.id ? (
                    <input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit()
                        if (e.key === "Escape") cancelEdit()
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-base text-[#1E293B] font-medium bg-white border border-[#2563EB] rounded-md px-2 py-0.5 outline-none w-full"
                    />
                  ) : (
                    <div
                      className="text-base text-[#1E293B] font-medium truncate hover:text-[#2563EB] transition-colors duration-150"
                      onClick={(e) => { e.stopPropagation(); startEditing(s.id, s.title) }}
                      title="点击重命名"
                    >
                      {s.title || "Untitled"}
                    </div>
                  )}
                  <div className="text-sm text-[#94A3B8] mt-0.5">
                    {s.time?.created ? new Date(s.time.created).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); startEditing(s.id, s.title) }}
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-all duration-150 cursor-pointer"
                  title="重命名"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id).then(({ error }) => { if (error) setErrorMsg(error) }) }}
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-lg text-[#94A3B8] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-all duration-150 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                </button>
                <svg className="w-5 h-5 text-[#CBD5E1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="h-12 flex items-center justify-center border-t border-[#E2E8F0]">
        <span className="text-xs text-[#94A3B8]">CaroCut v0.1</span>
      </footer>
    </div>
  )
}
