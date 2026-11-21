import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { HouseholdForm } from "@/components/HouseholdForm";
import { createRateLimiter } from "@/lib/rateLimit";
import type { Household } from "@/lib/schemas";
import { makeHousehold } from "../fixtures";

function Harness({ onState }: { onState: (h: Household) => void }) {
  const [value, setValue] = useState<Household>(makeHousehold());
  onState(value);
  return <HouseholdForm value={value} onChange={setValue} onSubmit={() => {}} busy={false} disabled={false} />;
}

describe("HouseholdForm inputs", () => {
  it("updates every kind of field", async () => {
    let state = makeHousehold();
    const user = userEvent.setup();
    render(<Harness onState={(h) => (state = h)} />);

    await user.click(screen.getByRole("checkbox", { name: "Asthma or COPD" }));
    await user.click(screen.getByRole("checkbox", { name: "Pregnancy" }));
    expect(state.conditions).toEqual(["asthma-copd", "pregnancy"]);
    await user.click(screen.getByRole("checkbox", { name: "Asthma or COPD" }));
    expect(state.conditions).toEqual(["pregnancy"]);

    await user.selectOptions(screen.getByRole("combobox", { name: "Cooking fuel" }), "biomass");
    await user.selectOptions(screen.getByRole("combobox", { name: "Winter heating" }), "kerosene");
    expect(state).toMatchObject({ cookingFuel: "biomass", heating: "kerosene" });

    fireEvent.change(screen.getByRole("slider", { name: /one-way distance/i }), { target: { value: "25" } });
    expect(state.commuteKm).toBe(25);

    await user.click(screen.getByRole("radio", { name: "Evenings" }));
    expect(state.exercise).toBe("evening");

    await user.type(screen.getByRole("textbox", { name: /anything else/i }), "Dog walk at 7");
    expect(state.notes).toBe("Dog walk at 7");
    expect(screen.getByText("267 characters left")).toBeInTheDocument();
  });

  it("lets people clear and retype a number, committing only valid values", async () => {
    let state = makeHousehold();
    const user = userEvent.setup();
    render(<Harness onState={(h) => (state = h)} />);
    const elders = screen.getByRole("spinbutton", { name: /elders/i });

    await user.clear(elders);
    expect(elders).toHaveValue(null);
    expect(state.elders).toBe(1);
    await user.type(elders, "3");
    expect(state.elders).toBe(3);

    // "9" is valid and committed; the second keystroke makes 99, which is over the limit and ignored.
    await user.clear(elders);
    await user.type(elders, "99");
    expect(elders).toHaveValue(99);
    expect(state.elders).toBe(9);
    // Leaving the field snaps the display back to the committed value.
    await user.tab();
    expect(elders).toHaveValue(9);
  });

  it("shows busy state while a plan is being written", () => {
    render(<HouseholdForm value={makeHousehold()} onChange={() => {}} onSubmit={() => {}} busy disabled={false} />);
    expect(screen.getByRole("button", { name: "Writing your plan…" })).toBeDisabled();
  });
});

describe("rate limiter memory bound", () => {
  it("evicts expired entries first, then the oldest, once full", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000 });
    for (let i = 0; i < 10_000; i++) limiter.check(`ip-${i}`, 0);
    // Window has passed for everyone: the next new key triggers a sweep of expired entries.
    expect(limiter.check("fresh", 5_000).ok).toBe(true);
    expect(limiter.check("ip-1", 5_000).ok).toBe(true);

    const full = createRateLimiter({ limit: 1, windowMs: 60_000 });
    for (let i = 0; i < 10_000; i++) full.check(`ip-${i}`, 0);
    // Nobody has expired: the oldest key is dropped to make room.
    expect(full.check("newcomer", 10).ok).toBe(true);
    expect(full.check("ip-0", 10).ok).toBe(true);
    expect(full.check("ip-5000", 10).ok).toBe(false);
  });
});
