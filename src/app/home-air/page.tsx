import type { Metadata } from "next";
import { HomeAir } from "@/components/HomeAir";
import { PageShell } from "@/components/PageShell";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Home air · ${BRAND.name}`,
  description: "Size a purifier, build a low-cost filter, and make every room cleaner during smog season.",
};

export default function HomeAirPage() {
  return (
    <PageShell
      title="Make home the cleanest air you breathe"
      lede="You spend most of the day indoors, and in a leaky home most of the smog follows you in. These fixes cut it room by room."
    >
      <HomeAir />
    </PageShell>
  );
}
