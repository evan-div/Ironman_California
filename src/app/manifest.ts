import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PROJECT 140.6",
    short_name: "140.6",
    description: "The Road to California — training journal and planning calendar.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#F7F7F2",
    theme_color: "#F7F7F2",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Calendar", url: "/calendar" },
      { name: "Activities", url: "/activities" },
    ],
  };
}
