"use client";

import { useEffect, useRef, useState } from "react";
import { FriendlyError, getAir, getPlan, loadLocal, saveLocal } from "@/lib/client";
import type { Plan } from "@/lib/planner";
import {
  DEFAULT_HOUSEHOLD,
  householdSchema,
  locationSchema,
  type AirSnapshot,
  type Household,
  type Place,
} from "@/lib/schemas";
import { AirHero } from "./AirHero";
import { AskCoach } from "./AskCoach";
import { EmptyPlan } from "./EmptyPlan";
import { HouseholdForm } from "./HouseholdForm";
import { PlanLoading } from "./PlanLoading";
import { PlanView } from "./PlanView";
import { SiteFooter } from "./SiteFooter";
import styles from "./VaatayanApp.module.css";

export const DEFAULT_PLACE: Place = { name: "New Delhi, Delhi, India", latitude: 28.61, longitude: 77.21 };

const PLACE_KEY = "vaatayan.place.v1";
const HOUSEHOLD_KEY = "vaatayan.household.v1";

function summarizePlan(plan: Plan): string {
  return [plan.headline, ...plan.items.map((i) => `- ${i.title}`)].join("\n").slice(0, 1200);
}

export function VaatayanApp() {
  const [place, setPlace] = useState<Place>(DEFAULT_PLACE);
  const [air, setAir] = useState<AirSnapshot | null>(null);
  const [airError, setAirError] = useState<string | null>(null);
  const [airLoading, setAirLoading] = useState(true);
  const [household, setHousehold] = useState<Household>(DEFAULT_HOUSEHOLD);
  const [plan, setPlan] = useState<{ plan: Plan; notice?: string } | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const planRef = useRef<HTMLDivElement>(null);
  const planController = useRef<AbortController | null>(null);

  // Restore saved choices once on the client.
  useEffect(() => {
    const savedPlace = loadLocal(PLACE_KEY, (v) => locationSchema.safeParse(v).data ?? null);
    const savedHousehold = loadLocal(HOUSEHOLD_KEY, (v) => householdSchema.safeParse(v).data ?? null);
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
    if (savedPlace) setPlace(savedPlace);
    if (savedHousehold) setHousehold(savedHousehold);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) saveLocal(HOUSEHOLD_KEY, household);
  }, [household, hydrated]);

  const [reloadKey, setReloadKey] = useState(0);

  // Fetch live air whenever the place changes or a retry is requested.
  // Loading flags are set by the event handlers that trigger a fetch, so the effect only syncs the result.
  useEffect(() => {
    if (!hydrated) return;
    const controller = new AbortController();
    getAir(place, controller.signal)
      .then((snapshot) => {
        setAir(snapshot);
        setAirLoading(false);
      })
      .catch((error: unknown) => {
        if ((error as Error).name === "AbortError") return;
        setAir(null);
        setAirError(error instanceof FriendlyError ? error.message : "Could not load air quality.");
        setAirLoading(false);
      });
    return () => controller.abort();
  }, [place, hydrated, reloadKey]);

  function startAirLoad() {
    setAirLoading(true);
    setAirError(null);
  }

  function retryAir() {
    startAirLoad();
    setReloadKey((k) => k + 1);
  }

  function selectPlace(next: Place) {
    startAirLoad();
    setPlace(next);
    setPlan(null);
    saveLocal(PLACE_KEY, next);
  }

  async function makePlan() {
    if (!air) return;
    planController.current?.abort();
    const controller = new AbortController();
    planController.current = controller;
    setPlanLoading(true);
    setPlanError(null);
    planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const result = await getPlan({ place, air, household }, controller.signal);
      setPlan(result);
      // Move focus to the new plan so keyboard and screen reader users land on it.
      requestAnimationFrame(() => document.getElementById("plan-headline")?.focus());
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setPlanError(error instanceof FriendlyError ? error.message : "Could not build your plan. Try again.");
    } finally {
      setPlanLoading(false);
    }
  }

  return (
    <>
      <AirHero
        place={place}
        air={air}
        loading={airLoading}
        error={airError}
        onSelectPlace={selectPlace}
        onRetry={retryAir}
      />

      <main id="main" className={styles.workspace}>
        <div className={styles.formCol}>
          <HouseholdForm
            value={household}
            onChange={setHousehold}
            onSubmit={makePlan}
            busy={planLoading}
            disabled={!air}
          />
        </div>

        <div className={styles.planCol} ref={planRef} aria-busy={planLoading}>
          {planError && (
            <div className={styles.error} role="alert">
              <p>{planError}</p>
              <button type="button" onClick={makePlan}>
                Try again
              </button>
            </div>
          )}

          {planLoading && <PlanLoading />}

          {!planLoading && plan && (
            <>
              <PlanView
                key={`${plan.plan.headline}-${plan.plan.items.length}`}
                plan={plan.plan}
                notice={plan.notice}
                hourly={air?.hourly}
              />
              {air && <AskCoach place={place} air={air} household={household} planSummary={summarizePlan(plan.plan)} />}
            </>
          )}

          {!planLoading && !plan && !planError && <EmptyPlan />}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
