/**
 * The site's public origin, used to build absolute URLs for link previews
 * (Open Graph and Twitter cards). Order of preference:
 * 1. NEXT_PUBLIC_SITE_URL, set explicitly for the deployed domain;
 * 2. the production domain Vercel provides automatically;
 * 3. localhost for development.
 * Invalid values are ignored rather than breaking the build.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): URL {
  const candidates = [
    env.NEXT_PUBLIC_SITE_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`,
    "http://localhost:3000",
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === "http:" || url.protocol === "https:") return url;
    } catch {
      /* not a URL: try the next option */
    }
  }
  return new URL("http://localhost:3000");
}
