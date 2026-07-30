import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/sudoku", "/sudoku/archive", "/about"].map((path) => ({
    url: `https://onegames.tterekli9.chatgpt.site${path}`,
    changeFrequency: path === "/sudoku" ? "daily" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
