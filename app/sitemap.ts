import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/play", "/pricing", "/sudoku", "/sudoku/archive", "/about", "/privacy", "/terms"].map((path) => ({
    url: `https://onegames.tterekli9.chatgpt.site${path}`,
    changeFrequency: path === "/sudoku" ? "daily" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
