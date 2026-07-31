import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

const PATHS = [
  "/",
  "/play",
  "/pricing",
  "/sudoku",
  "/sudoku/archive",
  "/about",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: path === "/sudoku" ? "daily" : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
