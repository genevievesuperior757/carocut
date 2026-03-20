"use client"

import type { PermissionRequest } from "@/lib/types"

interface PermissionDialogProps {
  request: PermissionRequest
  onReply: (reply: "once" | "always" | "reject") => void
}

export function PermissionDialog({ request, onReply }: PermissionDialogProps) {
  return (
    <div className="border-t border-[#E2E8F0] bg-[#FFFBEB]/80 backdrop-blur-xl px-4 py-3">
      <div className="rounded-xl bg-white px-4 py-3 border border-[#F59E0B]/20 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md bg-[#F59E0B]/10 flex items-center justify-center">
            <svg className="w-3 h-3 text-[#F59E0B]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-[#F59E0B]">Permission Required</span>
        </div>
        <p className="text-sm text-[#1E293B] mb-1 font-medium">{request.permission}</p>
        {request.patterns.length > 0 && (
          <pre className="mb-3 max-h-24 overflow-y-auto rounded-lg bg-[#F8FAFC] px-3 py-2 font-mono text-xs text-[#64748B] border border-[#E2E8F0]">
            {request.patterns.join("\n")}
          </pre>
        )}
        {request.metadata && Object.keys(request.metadata).length > 0 && (
          <pre className="mb-3 max-h-24 overflow-y-auto rounded-lg bg-[#F8FAFC] px-3 py-2 font-mono text-xs text-[#64748B] border border-[#E2E8F0]">
            {JSON.stringify(request.metadata, null, 2)}
          </pre>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onReply("once")}
            className="h-[30px] px-3 rounded-lg bg-white border border-[#E2E8F0] text-xs font-medium text-[#1E293B] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            Allow Once
          </button>
          <button
            type="button"
            onClick={() => onReply("always")}
            className="h-[30px] px-3 rounded-lg bg-[#10B981] text-xs font-medium text-white hover:bg-[#059669] transition-colors cursor-pointer"
          >
            Always Allow
          </button>
          <button
            type="button"
            onClick={() => onReply("reject")}
            className="h-[30px] px-3 rounded-lg bg-white border border-[#E2E8F0] text-xs font-medium text-[#64748B] hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}
