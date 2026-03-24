"use client"

import type { TokenUsage } from "@/hooks/use-token-usage"

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}

interface TokenUsageMetricsProps {
  usage: TokenUsage
}

export function TokenUsageMetrics({ usage }: TokenUsageMetricsProps) {
  const hasTokens = usage.input > 0 || usage.output > 0 || usage.reasoning > 0
  const hasCache = usage.cacheRead > 0 || usage.cacheWrite > 0

  if (!hasTokens && !hasCache) return null

  return (
    <div className="flex items-center gap-3 text-xs text-[#64748B]">
      {hasTokens && (
        <div className="flex items-center gap-1.5" title="Input / Output / Reasoning Tokens">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="font-medium">
            <span className="text-[#2563EB]">↑{formatNumber(usage.input)}</span>
            <span className="mx-0.5 text-[#CBD5E1]">/</span>
            <span className="text-[#10B981]">↓{formatNumber(usage.output)}</span>
            {usage.reasoning > 0 && (
              <>
                <span className="mx-0.5 text-[#CBD5E1]">/</span>
                <span className="text-[#EC4899]">{formatNumber(usage.reasoning)}</span>
              </>
            )}
          </span>
        </div>
      )}
      {hasCache && (
        <div className="flex items-center gap-1.5" title="Cache Read / Write">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <path d="M6 12h4m4 0h4" />
          </svg>
          <span className="font-medium">
            <span className="text-[#8B5CF6]">{formatNumber(usage.cacheRead)}</span>
            <span className="mx-0.5 text-[##CBD5E1]">/</span>
            <span className="text-[#F97316]">{formatNumber(usage.cacheWrite)}</span>
          </span>
        </div>
      )}
    </div>
  )
}
