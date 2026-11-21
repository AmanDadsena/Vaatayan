import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { PlanLoading, STAGES } from "@/components/PlanLoading";
import { PlanView } from "@/components/PlanView";
import { clockInWindow, readingAtClock } from "@/lib/breathWindow";
import { buildContext } from "@/lib/impact";
import { buildRulePlan } from "@/lib/planner";
import { makeAir, makeHousehold, must } from "../fixtures";

const air = makeAir();

describe("readingAtClock", () => {
  it("finds the next occurrence of a clock time in the 24-hour forecast", () => {
    // The fixture starts at 15:00 on the 21st, so 08:00 refers to the 22nd.
    expect(readingAtClock(air.hourly, "08:00")?.time).toBe("2026-11-22T08:00");
    expect(readingAtClock(air.hourly, "15:30")?.time).toBe("2026-11-21T15:00");
  });

  it("returns null for malformed times or missing data", () => {
    expect(readingAtClock(air.hourly, "8am")).toBeNull();
    expect(readingAtClock([], "08:00")).toBeNull();
  });
});

describe("clockInWindow", () => {
  const window = { start: "2026-11-22T12:00", end: "2026-11-22T14:00" };

  it.each([
    ["11:59", false],
    ["12:00", true],
    ["13:45", true],
    ["14:00", false],
  ])("%s inside 12–2 pm is %s", (clock, inside) => {
    expect(clockInWindow(clock, window)).toBe(inside);
  });

  it("handles a window that runs past midnight", () => {
    const late = { start: "2026-11-21T23:00", end: "2026-11-22T01:00" };
    expect(clockInWindow("23:30", late)).toBe(true);
    expect(clockInWindow("00:30", late)).toBe(true);
    expect(clockInWindow("01:00", late)).toBe(false);
  });

  it("is false without a window or with a bad time", () => {
    expect(clockInWindow("12:00", null)).toBe(false);
    expect(clockInWindow("noon", window)).toBe(false);
  });
});

describe("PlanLoading", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("walks through the real stages of writing a plan", async () => {
    vi.useFakeTimers();
    const { container } = render(<PlanLoading />);
    const items = () => within(screen.getByRole("status")).getAllByRole("listitem");

    expect(items()).toHaveLength(STAGES.length);
    expect(items()[0]).toHaveAttribute("data-state", "active");

    act(() => vi.advanceTimersByTime(STAGES[2].after));
    expect(items()[0]).toHaveAttribute("data-state", "done");
    expect(items()[1]).toHaveAttribute("data-state", "done");
    expect(items()[2]).toHaveAttribute("data-state", "active");
    expect(items()[0]).toHaveTextContent("(done)");

    act(() => vi.advanceTimersByTime(60_000));
    expect(items()[STAGES.length - 1]).toHaveAttribute("data-state", "active");

    vi.useRealTimers();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("PlanView timeline and ledger", () => {
  const plan = buildRulePlan(buildContext(makeHousehold(), air));

  it("shows the forecast AQI at each step and marks the clean window", async () => {
    const { container } = render(<PlanView plan={plan} hourly={air.hourly} />);
    const timeline = screen.getByRole("heading", { name: "Today, hour by hour" }).closest("section")!;
    expect(within(timeline).getAllByText(/^Forecast AQI \d+/).length).toBeGreaterThan(0);
    const tagged = within(timeline).getAllByText("In your clean window");
    expect(tagged.length).toBeGreaterThan(0);
    for (const tag of tagged) {
      const time = tag.closest("li")!.querySelector("time")!.textContent!;
      expect(clockInWindow(time, plan.cleanWindow)).toBe(true);
    }
    expect(await axe(container)).toHaveNoViolations();
  });

  it("works without forecast data", () => {
    render(<PlanView plan={plan} />);
    expect(screen.queryByText(/^Forecast AQI/)).not.toBeInTheDocument();
  });

  it("states the cigarette figure in text and draws it as decoration", () => {
    const { container } = render(<PlanView plan={plan} hourly={air.hourly} />);
    const ledger = screen.getByRole("region", { name: /if you do the/i });
    expect(ledger).toHaveTextContent(/cigarettes' worth of PM2\.5/);
    const glyphs = container.querySelectorAll("svg[class*=cig]");
    expect(glyphs.length).toBe(Math.min(20, Math.ceil(plan.cigarettesAvoidedPerDay)));
    expect(must(glyphs[0], "first glyph").closest("[aria-hidden=true]")).not.toBeNull();
  });
});
