"use client"

interface ImageViewerProps {
  src: string
  alt: string
}

export function ImageViewer({ src, alt }: ImageViewerProps) {
  return (
    <div className="flex items-center justify-center p-6 h-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-[calc(100vh-200px)] max-w-full rounded-2xl object-contain shadow-[0_2px_8px_rgba(0,0,0,0.08),0_16px_48px_rgba(0,0,0,0.06)]" />
    </div>
  )
}
