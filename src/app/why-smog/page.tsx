import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { Photo } from "@/components/Photo";
import { SmogExplainer } from "@/components/SmogExplainer";
import { BRAND } from "@/lib/brand";
import { PHOTOS } from "@/lib/photos";

export const metadata: Metadata = {
  title: `Why winter smog · ${BRAND.name}`,
  description: "Why smog gets so much worse in winter, how small PM2.5 really is, and where it comes from.",
};

export default function WhySmogPage() {
  return (
    <PageShell
      title="Why winter air turns grey"
      lede="Every November the same city, with roughly the same traffic and fires, suddenly can't breathe. Here is what changes, and why it matters for your family."
    >
      <Photo
        photo={PHOTOS.smogSkyline}
        variant="banner"
        priority
        sizes="(max-width: 1180px) 100vw, 1180px"
        caption="Central Delhi under a winter haze."
      />
      <SmogExplainer />
    </PageShell>
  );
}
