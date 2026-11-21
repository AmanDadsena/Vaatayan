// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as askPOST } from "@/app/api/ask/route";
import { POST as planPOST } from "@/app/api/plan/route";
import { API_CSP, buildCsp, createNonce } from "@/lib/csp";
import { guardJsonPost } from "@/lib/http";
import nextConfig from "../../next.config";
import { config as proxyConfig, proxy } from "@/proxy";
import { makeAir, makeHousehold, PLACE } from "../fixtures";

const directive = (csp: string, name: string) =>
  csp
    .split("; ")
    .find((d) => d.startsWith(`${name} `) || d === name)
    ?.split(" ")
    .slice(1) ?? null;

describe("buildCsp", () => {
  const prod = buildCsp("abc123", { dev: false, https: true });

  it("only runs scripts carrying this request's nonce", () => {
    expect(directive(prod, "script-src")).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
  });

  it("never allows inline or eval scripts in production", () => {
    const scripts = directive(prod, "script-src")!;
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it("blocks plugins, framing, foreign forms and base-tag hijacks", () => {
    expect(directive(prod, "object-src")).toEqual(["'none'"]);
    expect(directive(prod, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(prod, "frame-src")).toEqual(["'none'"]);
    expect(directive(prod, "form-action")).toEqual(["'self'"]);
    expect(directive(prod, "base-uri")).toEqual(["'self'"]);
  });

  it("only lets the browser talk to this site", () => {
    expect(directive(prod, "connect-src")).toEqual(["'self'"]);
    expect(directive(prod, "default-src")).toEqual(["'self'"]);
  });

  it("upgrades insecure requests only on HTTPS, so local http still works", () => {
    expect(prod).toContain("upgrade-insecure-requests");
    expect(buildCsp("n", { dev: false, https: false })).not.toContain("upgrade-insecure-requests");
  });

  it("adds eval and hot-reload sockets only in development", () => {
    const dev = buildCsp("n", { dev: true, https: false });
    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toEqual(["'self'", "ws:", "wss:"]);
  });

  it("locks API responses down completely", () => {
    expect(API_CSP).toContain("default-src 'none'");
    expect(API_CSP).toContain("frame-ancestors 'none'");
  });
});

describe("createNonce", () => {
  it("is 128 bits of base64 and different every time", () => {
    const nonces = new Set(Array.from({ length: 200 }, () => createNonce()));
    expect(nonces.size).toBe(200);
    for (const n of nonces) {
      expect(n).toMatch(/^[A-Za-z0-9+/]{22}==$/);
      expect(atob(n)).toHaveLength(16);
    }
  });
});

describe("proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sends a fresh nonce-based CSP with every page and hands the nonce to Next.js", () => {
    vi.stubEnv("NODE_ENV", "production");
    const first = proxy(new NextRequest("https://vaatayan.example/"));
    const second = proxy(new NextRequest("https://vaatayan.example/"));
    const csp1 = first.headers.get("content-security-policy")!;
    const csp2 = second.headers.get("content-security-policy")!;

    const nonce = csp1.match(/'nonce-([^']+)'/)![1];
    expect(csp2).not.toContain(nonce);
    expect(csp1).toContain("upgrade-insecure-requests");
    expect(first.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(first.headers.get("x-middleware-request-content-security-policy")).toBe(csp1);
  });

  it("trusts the proxy's protocol header behind a TLS-terminating host", () => {
    const res = proxy(new NextRequest("http://internal/", { headers: { "x-forwarded-proto": "https" } }));
    expect(res.headers.get("content-security-policy")).toContain("upgrade-insecure-requests");
  });

  it("skips API routes, static files and prefetches", () => {
    const [rule] = proxyConfig.matcher;
    const pattern = new RegExp(`^${rule.source}$`);
    for (const path of ["/", "/impact", "/home-air", "/why-smog"]) expect(pattern.test(path)).toBe(true);
    for (const path of ["/api/plan", "/_next/static/chunks/a.js", "/_next/image", "/images/metro.jpg", "/icon.svg"]) {
      expect(pattern.test(path)).toBe(false);
    }
    expect(rule.missing.map((m) => m.key)).toEqual(["next-router-prefetch", "purpose"]);
  });
});

describe("response headers", () => {
  it("hardens every response and locks down the API", async () => {
    const rules = await nextConfig.headers!();
    const all = Object.fromEntries(rules.find((r) => r.source === "/:path*")!.headers.map((h) => [h.key, h.value]));
    expect(all).toMatchObject({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Permitted-Cross-Domain-Policies": "none",
    });
    expect(all["Permissions-Policy"]).toMatch(/camera=\(\).*microphone=\(\)/);
    expect(all["Content-Security-Policy"]).toBeUndefined();
    const api = rules.find((r) => r.source === "/api/:path*")!;
    expect(api.headers).toContainEqual({ key: "Content-Security-Policy", value: API_CSP });
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});

describe("guardJsonPost", () => {
  const post = (headers: Record<string, string>) =>
    new Request("https://vaatayan.example/api/plan", { method: "POST", headers, body: "{}" });

  it("allows same-origin JSON posts", () => {
    expect(
      guardJsonPost(
        post({
          origin: "https://vaatayan.example",
          "sec-fetch-site": "same-origin",
          "content-type": "application/json",
        }),
      ),
    ).toBeNull();
  });

  it("allows non-browser clients that send no origin headers", () => {
    expect(guardJsonPost(post({ "content-type": "application/json; charset=utf-8" }))).toBeNull();
  });

  it("refuses cross-site posts by fetch metadata or by origin", async () => {
    const bySite = guardJsonPost(post({ "sec-fetch-site": "cross-site", "content-type": "application/json" }))!;
    expect(bySite.status).toBe(403);
    expect((await bySite.json()).error).toMatch(/other websites/);
    expect(guardJsonPost(post({ origin: "https://evil.example", "content-type": "application/json" }))!.status).toBe(
      403,
    );
    expect(guardJsonPost(post({ origin: "null", "content-type": "application/json" }))!.status).toBe(403);
  });

  it("matches the public host behind a proxy", () => {
    const req = new Request("http://10.0.0.5/api/plan", {
      method: "POST",
      headers: {
        origin: "https://vaatayan.example",
        "x-forwarded-host": "vaatayan.example",
        "content-type": "application/json",
      },
      body: "{}",
    });
    expect(guardJsonPost(req)).toBeNull();
  });

  it("refuses form-style posts that are not JSON", () => {
    expect(guardJsonPost(post({ "content-type": "application/x-www-form-urlencoded" }))!.status).toBe(415);
    expect(guardJsonPost(post({ "content-type": "text/plain" }))!.status).toBe(415);
    expect(guardJsonPost(post({}))!.status).toBe(415);
  });

  it("is enforced on both state-changing routes before any work happens", async () => {
    const body = JSON.stringify({ place: PLACE, air: makeAir(), household: makeHousehold(), question: "Can we walk?" });
    const attack = { origin: "https://evil.example", "content-type": "application/json" };
    const plan = await planPOST(
      new Request("https://vaatayan.example/api/plan", { method: "POST", headers: attack, body }),
    );
    const ask = await askPOST(
      new Request("https://vaatayan.example/api/ask", { method: "POST", headers: attack, body }),
    );
    expect(plan.status).toBe(403);
    expect(ask.status).toBe(403);
  });
});
