"use client"

import { useEffect, useRef } from "react"

interface AutocompleteItem {
  name: string
  description?: string
}

interface MentionAutocompleteProps {
  items: AutocompleteItem[]
  selectedIndex: number
  onSelect: (item: AutocompleteItem) => void
  visible: boolean
  trigger: "/" | "@"
}

export function MentionAutocomplete({
  items,
  selectedIndex,
  onSelect,
  visible,
  trigger,
}: MentionAutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!listRef.current || !visible) return
    const el = listRef.current.children[selectedIndex] as HTMLElement
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex, visible])

  if (!visible || items.length === 0) return null

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-lg border border-[#E2E8F0] bg-white shadow-lg"
    >
      {items.map((item, index) => (
        <button
          key={item.name}
          type="button"
          onClick={() => onSelect(item)}
          className={`w-full px-4 py-2 text-left text-sm transition-colors ${
            index === selectedIndex ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#1E293B] hover:bg-[#F8FAFC]"
          }`}
        >
          <span className="font-mono font-medium">
            {trigger}
            {item.name}
          </span>
          {item.description && <span className="ml-2 text-[#64748B]">— {item.description}</span>}
        </button>
      ))}
    </div>
  )
}
