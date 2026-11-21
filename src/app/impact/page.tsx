import type { Metadata } from "next";
import { ImpactLab } from "@/components/ImpactLab";
import { PageShell } from "@/components/PageShell";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Impact lab · ${BRAND.name}`,
  description:
    "See what switching your commute, heating or cooking does for your lungs, the climate and your city's smog.",
};

export default function ImpactPage() {
  return (
    <PageShell
      title="What changes if you change"
      lede="Try a different commute, heater or stove and see the effect on what your family breathes, on carbon, and on the smog your street shares."
    >
      <ImpactLab />
    </PageShell>
  );
}
