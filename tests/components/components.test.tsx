import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { BreathRibbon } from "@/components/BreathRibbon";
import { HouseholdForm } from "@/components/HouseholdForm";
import { PlaceSearch } from "@/components/PlaceSearch";
import { PlanView } from "@/components/PlanView";
import { buildContext } from "@/lib/impact";
import { buildRulePlan } from "@/lib/planner";
import type { Household } from "@/lib/schemas";
import { makeAir, makeHousehold, PLACE } from "../fixtures";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

describe("BreathRibbon", () => {
  it("announces the clean window in text and offers an hour-by-hour table", async () => {
    const { container } = render(<BreathRibbon hourly={makeAir().hourly} />);
    expect(screen.getByText(/Cleanest time to be outside: 12 pm to 2 pm/)).toBeInTheDocument();
    expect(screen.getAllByText("12 pm–2 pm").length).toBeGreaterThan(0);
    const table = screen.getByRole("table", { name: /forecast us aqi/i });
    expect(within(table).getAllByRole("row")).toHaveLength(25);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders nothing without data", () => {
    const { container } = render(<BreathRibbon hourly={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("PlanView", () => {
  const plan = buildRulePlan(buildContext(makeHousehold(), makeAir()));

  it("shows the routine, actions and impact ledger accessibly", async () => {
    const { container } = render(<PlanView plan={plan} />);
    expect(screen.getByRole("heading", { level: 2, name: plan.headline })).toBeInTheDocument();
    expect(screen.getByText("Quick plan from built-in rules")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Today, hour by hour" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: /I'll do this/ })).toHaveLength(plan.items.length);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("recalculates the ledger when an action is unticked", async () => {
    const user = userEvent.setup();
    render(<PlanView plan={plan} />);
    const ledger = screen.getByRole("region", { name: /if you do the/i });
    expect(ledger).toHaveTextContent(`If you do the ${plan.items.length} things`);

    await user.click(screen.getAllByRole("checkbox", { name: /I'll do this/ })[0]);
    expect(ledger).toHaveTextContent(`If you do the ${plan.items.length - 1} things`);
  });

  it("explains when the AI was unavailable", () => {
    render(<PlanView plan={plan} notice="The AI service is busy." />);
    expect(screen.getByRole("note")).toHaveTextContent("The AI service is busy.");
  });
});

describe("HouseholdForm", () => {
  function Harness({ onSubmit = vi.fn(), disabled = false }) {
    const [value, setValue] = useState<Household>(makeHousehold());
    return <HouseholdForm value={value} onChange={setValue} onSubmit={onSubmit} busy={false} disabled={disabled} />;
  }

  it("is accessible and fully keyboard operable", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<Harness onSubmit={onSubmit} />);
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole("button", { name: "More children" }));
    expect(screen.getByRole("spinbutton", { name: /children/i })).toHaveValue(2);

    await user.click(screen.getByRole("radio", { name: "Metro" }));
    expect(screen.getByRole("radio", { name: "Metro" })).toBeChecked();

    await user.click(screen.getByRole("switch", { name: /air purifier/i }));
    expect(screen.getByRole("switch", { name: /air purifier/i })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Make today's plan" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("hides the distance slider for people who work from home", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole("slider", { name: /one-way distance/i })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Work from home" }));
    expect(screen.queryByRole("slider", { name: /one-way distance/i })).not.toBeInTheDocument();
  });

  it("does not let the adult count drop below one", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const fewer = screen.getByRole("button", { name: "Fewer adults" });
    await user.click(fewer);
    expect(fewer).toBeDisabled();
    expect(screen.getByRole("spinbutton", { name: /adults/i })).toHaveValue(1);
  });

  it("disables submission until air data has loaded", () => {
    render(<Harness disabled />);
    expect(screen.getByRole("button", { name: "Make today's plan" })).toBeDisabled();
    expect(screen.getByText("Waiting for live air data first.")).toBeInTheDocument();
  });
});

describe("PlaceSearch", () => {
  it("follows the combobox pattern: type, arrow, enter", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ places: [PLACE, { name: "Delhi, New York, United States", latitude: 42.3, longitude: -74.9 }] })),
    );
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<PlaceSearch onSelect={onSelect} />);

    const input = screen.getByRole("combobox", { name: /where are you breathing/i });
    await user.type(input, "Delhi");
    await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "true"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(input.getAttribute("aria-activedescendant")).toBe(screen.getAllByRole("option")[1].id);
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Delhi, New York, United States" }));
  });

  it("shows a friendly message when search fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "Place search is unavailable." }), { status: 502 }));
    const user = userEvent.setup();
    render(<PlaceSearch onSelect={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "Pune");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Place search is unavailable."));
  });

  it("falls back gracefully when geolocation is blocked", async () => {
    const getCurrentPosition = vi.fn((_ok: PositionCallback, fail?: PositionErrorCallback | null) =>
      fail?.({ code: 1 } as GeolocationPositionError),
    );
    Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition }, configurable: true });
    const user = userEvent.setup();
    render(<PlaceSearch onSelect={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Use my location" }));
    await act(async () => {});
    expect(screen.getByRole("status")).toHaveTextContent(/blocked/);
  });
});
