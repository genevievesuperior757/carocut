interface LogoIconProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizes = {
  sm: { container: "w-7 h-7", icon: "w-[18px] h-[18px]" },
  md: { container: "w-8 h-8", icon: "w-[20px] h-[20px]" },
  lg: { container: "w-10 h-10", icon: "w-[24px] h-[24px]" },
}

export function LogoIcon({ size = "md", className = "" }: LogoIconProps) {
  const s = sizes[size]
  return (
    <div className={`${s.container} rounded-xl bg-[#2563EB] flex items-center justify-center ${className}`}>
      <svg className={`${s.icon}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Play triangle with a diagonal cut through the middle */}
        <path d="M6 4L20 12L6 20V4Z" fill="white" />
        <line x1="4" y1="18" x2="18" y2="6" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

interface LogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
}

const textSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
}

export function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoIcon size={size} />
      {showText && (
        <span className={`${textSizes[size]} font-semibold text-[#1E293B]`}>CaroCut</span>
      )}
    </div>
  )
}
