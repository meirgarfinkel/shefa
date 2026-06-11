import type { MetadataRoute } from "next";

// Generated at /manifest.webmanifest and auto-linked by Next. Brand colors match the
// dark-blue surface used across the app (see globals.css --blue-dark-1).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shefa",
    short_name: "Shefa",
    description: "A nonprofit job board connecting employers with candidates eager to learn.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a334e",
    theme_color: "#0a334e",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
