"use client";

import { useRef } from "react";
import { DEFAULT_HOUSEHOLD, readStoredHousehold, readStoredPlace, STORAGE_KEYS } from "@/lib/domain";
import type { Plan } from "@/lib/planner";
import type { Place } from "@/lib/schemas";
import { AirHero } from "./AirHero";
import { AskCoach } from "./AskCoach";
import { EmptyPlan } from "./EmptyPlan";
import { HouseholdForm } from "./HouseholdForm";
import { PlanLoading } from "./PlanLoading";
import { PlanView } from "./PlanView";
import { SiteFooter } from "./SiteFooter";
import { useLiveAir } from "./useLiveAir";
import { usePlanRequest } from "./usePlanRequest";
import { useStoredState } from "./useStoredState";
import styles from "./VaatayanApp.module.css";

export const DEFAULT_PLACE: Place = { name: "New Delhi, Delhi, India", latitude: 28.61, longitude: 77.21 };

function summarizePlan(plan: Plan): string {
  return [plan.headline, ...plan.items.map((i) => `- ${i.title}`)].join("\n").slice(0, 1200);
}

/** The Today page: live air for the chosen place, the household form, and the plan. */
export function VaatayanApp() {
  const [place, setPlace] = useStoredState(STORAGE_KEYS.place, readStoredPlace, DEFAULT_PLACE);
  const [household, setHousehold] = useStoredState(STORAGE_KEYS.household, readStoredHousehold, DEFAULT_HOUSEHOLD);
  const live = useLiveAir(place);
  const planRequest = usePlanRequest();
  const planColumn = useRef<HTMLDivElement>(null);
  const { air } = live;

  function selectPlace(next: Place) {
    setPlace(next);
    planRequest.reset();
  }

  async function makePlan() {
    if (!air) return;
    planColumn.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    await planRequest.request({ place, air, household });
    // Move focus to the new plan so keyboard and screen reader users land on it.
    requestAnimationFrame(() => document.getElementById("plan-headline")?.focus());
  }

  const { result, loading, error } = planRequest;

  return (
    <>
      <AirHero
        place={place}
        air={air}
        loading={live.loading}
        error={live.error}
        onSelectPlace={selectPlace}
        onRetry={live.retry}
      />

      <main id="main" className={styles.workspace}>
        <div className={styles.formCol}>
          <HouseholdForm
            value={household}
            onChange={setHousehold}
            onSubmit={makePlan}
            busy={loading}
            disabled={!air || live.loading}
          />
        </div>

        <div className={styles.planCol} ref={planColumn} aria-busy={loading}>
          {error && (
            <div className={styles.error} role="alert">
              <p>{error}</p>
              <button type="button" onClick={makePlan}>
                Try again
              </button>
            </div>
          )}

          {loading && <PlanLoading />}

          {!loading && result && (
            <>
              <PlanView
                key={`${result.plan.headline}-${result.plan.items.length}`}
                plan={result.plan}
                notice={result.notice}
                hourly={air?.hourly}
              />
              {air && (
                <AskCoach place={place} air={air} household={household} planSummary={summarizePlan(result.plan)} />
              )}
            </>
          )}

          {!loading && !result && !error && <EmptyPlan />}
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
