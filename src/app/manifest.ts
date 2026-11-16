import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Upper Echelon",
    short_name: "Echelon",
    description: "A society for sharp minds: eight cognitive trials, a directory of renowned tests, and a forum.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#0b0b0a",
    theme_color: "#0b0b0a",
    categories: ["education", "games", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "The Arena", url: "/arena" },
      { name: "The Forum", url: "/forum" },
      { name: "Messages", url: "/messages" },
    ],
  };
}
