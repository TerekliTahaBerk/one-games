const FALLBACK_ORIGIN = "https://onegames.tterekli9.chatgpt.site";

/**
 * The canonical public origin, with no trailing slash.
 *
 * `PUBLIC_BASE_URL` is the source of truth in every hosted environment; the
 * fallback only keeps local builds and the sitemap sane when it is unset.
 */
export function getSiteOrigin(): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (!configured) return FALLBACK_ORIGIN;
  try {
    return new URL(configured).origin;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

export function absoluteUrl(path: string): string {
  return `${getSiteOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}
