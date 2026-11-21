"use client";

import { useMemo, useState } from "react";
import { readStoredHousehold, STORAGE_KEYS } from "@/lib/domain";
import { seedLabSettings, type LabSettings } from "@/lib/labSettings";
import { addDeltas, compareCommute, compareFuel, COOKING, HEATING } from "@/lib/simulator";
import { useStoredState } from "@/hooks/useStoredState";
import { CommuteSection } from "./impact-lab/CommuteSection";
import { FuelSection } from "./impact-lab/FuelSection";
import { ScaleUpSection } from "./impact-lab/ScaleUpSection";
import type { UpdateSetting } from "./impact-lab/settings";
import { TransitBand } from "./impact-lab/TransitBand";

/** The what-if simulator: commute and fuel swaps, and what they add up to across a city. */
export function ImpactLab() {
  // Start from the household saved on the Today page; only the user's own edits live in state.
  const [saved] = useStoredState(STORAGE_KEYS.household, readStoredHousehold, null);
  const [edits, setEdits] = useState<Partial<LabSettings>>({});
  const settings: LabSettings = { ...seedLabSettings(saved), ...edits };
  const update: UpdateSetting = (key) => (value) => setEdits((current) => ({ ...current, [key]: value }));

  const { from, to, km, days, pm25, heatFrom, heatTo, cookFrom, cookTo, people } = settings;
  const commute = useMemo(() => compareCommute({ from, to, km, days, pm25 }), [from, to, km, days, pm25]);
  const fuel = useMemo(
    () =>
      addDeltas(
        compareFuel(HEATING[heatFrom], HEATING[heatTo], people),
        compareFuel(COOKING[cookFrom], COOKING[cookTo], people),
      ),
    [heatFrom, heatTo, cookFrom, cookTo, people],
  );

  return (
    <>
      <CommuteSection settings={settings} update={update} delta={commute} />
      <TransitBand />
      <FuelSection settings={settings} update={update} delta={fuel} />
      <ScaleUpSection
        total={addDeltas(commute, fuel)}
        stepIndex={settings.stepIndex}
        onStepChange={update("stepIndex")}
      />
    </>
  );
}
