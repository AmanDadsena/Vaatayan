/**
 * Content Security Policy for pages. Scripts are locked to a fresh per-request
 * nonce with 'strict-dynamic': no inline or injected script can run unless the
 * server rendered it. All data, AI and map calls go through our own API, so the
 * browser only ever talks to 'self'.
 *
 * Styles keep 'unsafe-inline' on purpose: the live visuals (haze density,
 * forecast bar heights, the AQI marker) are inline style attributes, which a
 * nonce cannot cover, and style injection cannot execute code.
 */
interface CspOptions {
  /** Development needs eval (React debugging) and websockets (hot reload). */
  dev: boolean;
  /** Only ask browsers to upgrade requests when the page itself is served over HTTPS. */
  https: boolean;
}

/** The page Content-Security-Policy: scripts only by nonce, no framing, no plugins. Dev adds eval for hot reload. */
export function buildCsp(nonce: string, { dev, https }: CspOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(dev ? ["ws:", "wss:"] : [])],
    "media-src": ["'none'"],
    "object-src": ["'none'"],
    "frame-src": ["'none'"],
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (https) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

/** A 128-bit random nonce, base64-encoded, from the Web Crypto API. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Locked-down policy for API responses, which never render HTML. */
export const API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";
