import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "247 AI Employees",
    short_name: "247 AI",
    description: "Deploy AI employees that work 24/7.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#3b82f6",
    icons: [
      {
        src: "/images/logo-transparent.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/images/logo-transparent.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
