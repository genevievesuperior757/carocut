"use client"

interface VideoPlayerProps {
  src: string
  name: string
}

export function VideoPlayer({ src, name }: VideoPlayerProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 gap-4">
      <video
        src={src}
        controls
        className="w-full max-h-[60vh] rounded-lg bg-black shadow-lg"
      >
        Your browser does not support the video tag.
      </video>
      <a
        href={src}
        download={name}
        className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-sm font-medium transition-colors duration-150"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        下载视频
      </a>
    </div>
  )
}
