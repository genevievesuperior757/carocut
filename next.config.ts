import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["@opencode-ai/sdk"],
  devIndicators: {
    position: "bottom-right",
  },
}

export default nextConfig
