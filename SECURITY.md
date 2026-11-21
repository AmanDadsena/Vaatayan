# Security policy

## Reporting a vulnerability

Please report security issues privately through
[GitHub security advisories](https://github.com/AmanDadsena/Vaatayan/security/advisories/new),
not in public issues. Include steps to reproduce and the impact you expect.

## How Vaatayan protects users

- **Secrets stay on the server.** AI and data keys are read only by server code and never sent to the browser.
- **Per-request Content-Security-Policy.** Every page gets a fresh nonce; only scripts the server rendered can run
  (`'strict-dynamic'`, no inline or eval code in production). API responses use `default-src 'none'`.
- **Cross-site requests are refused.** State-changing API calls must come from this site with a JSON body.
- **Every input is validated** with Zod (types, ranges, lengths), request bodies are capped at 32 KB, and free text
  is stripped of control characters and fenced as data in AI prompts.
- **Model output is never trusted.** Plans are schema-validated, unknown actions are dropped, all numbers are computed
  by the app, and text is rendered as text, never as HTML.
- **Rate limits** apply to every API route.
- **Hardened headers:** HSTS, `X-Frame-Options: DENY`, `nosniff`, strict referrer policy, a restrictive
  `Permissions-Policy`, and same-origin cross-origin policies.
- **Privacy:** coordinates are rounded to about 1 km before leaving the server; household details stay in the browser.
