import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OneGames",
    short_name: "OneGames",
    description: "One thoughtful game at a time.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [{ src: "/onegames-mark.png", sizes: "512x512", type: "image/png" }],
  };
}
