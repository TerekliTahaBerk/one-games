import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OneGames",
    short_name: "OneGames",
    description: "One good game at a time.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f0e7",
    theme_color: "#f3f0e7",
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
