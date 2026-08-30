import type { MetadataRoute } from "next";

/**
 * The one installed-app manifest for the whole platform.
 *
 * There used to be two: this route and a static `public/manifest.json`. The
 * static file wins that collision, so the manifest actually served was the
 * patient one - it named the app "WonFlow HPBSP Patient Portal" and set
 * `start_url` to `/patient/dashboard`, which meant a receptionist or a surgeon
 * who installed WonFlow got an app that opened on a patient screen they have
 * no permission to see. The static file is gone and this is the only manifest.
 *
 * `start_url` is `/`, which redirects to sign-in and from there to whichever
 * portal the account actually holds. That is the only start point correct for
 * every role, and it is the same rule the browser tab already follows.
 *
 * Nothing here locks orientation. The workspaces are responsive and a
 * clinician holding a tablet sideways at a bedside should get the wide layout,
 * not a letterboxed portrait one.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WonFlow Hospital Platform",
    short_name: "WonFlow",
    description:
      "Hospital operations, clinical care and patient recovery in one place.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#2563eb",
    categories: ["medical", "health", "productivity"],
    icons: [
      {
        src: "/brand/wonflow-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/wonflow-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Android crops icons to whatever shape the launcher uses. These are
      // inset far enough that the crop takes background rather than the mark.
      {
        src: "/brand/wonflow-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/brand/wonflow-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
