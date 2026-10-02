import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Selaura Marketplace",
    short_name: "Selaura",
    description:
      "Discover mods, addons, resource packs, worlds, and more for Minecraft Bedrock.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f1e3",
    theme_color: "#f2f1e3",
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
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
