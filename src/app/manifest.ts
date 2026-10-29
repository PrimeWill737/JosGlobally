import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jos Globally",
    short_name: "Jos Globally",
    description: "From the Jos Plateau to the World.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    theme_color: "#123C35",
    background_color: "#F5F2E9",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
