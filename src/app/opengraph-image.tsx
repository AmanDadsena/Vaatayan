import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";
import { logoDataUri } from "@/lib/logo";
import { skyFor } from "@/lib/sky";

export const alt = `${BRAND.name}: ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social card: the mark, the promise, and a sky shifting from smog to clear. */
export default function OpengraphImage() {
  const smog = skyFor(260);
  const clear = skyFor(20);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `linear-gradient(110deg, ${smog.top} 0%, ${smog.horizon} 38%, ${clear.horizon} 62%, ${clear.top} 100%)`,
          padding: 72,
          alignItems: "center",
          gap: 56,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoDataUri(260)} width={260} height={260} alt="" style={{ borderRadius: 64 }} />
        <div style={{ display: "flex", flexDirection: "column", color: "#142b2a" }}>
          <div style={{ fontSize: 108, fontWeight: 800, letterSpacing: -4 }}>{BRAND.name}</div>
          <div style={{ fontSize: 46, marginTop: 8 }}>{BRAND.tagline}</div>
          <div style={{ fontSize: 28, marginTop: 28, opacity: 0.8, maxWidth: 680 }}>
            Live air, the cleanest hours of your day, and an AI plan for your family through winter smog.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
