import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WonFlow Hospital Management System",
    short_name: "WonFlow",
    description: "Modern Hospital Management, Scheduling & Patient Flow Platform",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    orientation: "portrait",
    icons: [
      {
        src: "/brand/wonflow-mark.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/brand/wonflow-mark.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
