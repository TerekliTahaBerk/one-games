import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

const PATHS = [
  "/",
  "/play",
  "/pricing",
  "/sudoku",
  "/sudoku/archive",
  "/dna",
  "/dna/archive",
  "/word",
  "/word/archive",
  "/about",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({
    url: absoluteUrl(path),
    changeFrequency:
      path === "/sudoku" || path === "/dna" || path === "/word"
        ? "daily"
        : "monthly",
    priority: path === "/" ? 1 : 0.8,
  }));
}
