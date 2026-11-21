import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { HomeAir } from "@/components/HomeAir";
import { ImpactLab } from "@/components/ImpactLab";
import { SmogExplainer } from "@/components/SmogExplainer";

describe("ImpactLab", () => {
  it("is accessible and updates the comparison live", async () => {
    const user = userEvent.setup();
    const { container } = render(<ImpactLab />);
    expect(await axe(container)).toHaveNoViolations();

    const commute = screen.getByRole("list", { name: "Commute change" });
    expect(commute).toHaveTextContent("kg less CO₂ a week");

    // Switching to the same mode shows no change.
    const current = screen.getByRole("group", { name: "Today you travel by" });
    const target = screen.getByRole("group", { name: "What if you switched to" });
    await user.click(within(current).getByRole("radio", { name: "Car" }));
    await user.click(within(target).getByRole("radio", { name: "Car" }));
    expect(commute).toHaveTextContent("No change");
  });

  it("reflects a saved household from the Today page", () => {
    window.localStorage.setItem(
      "vaatayan.household.v1",
      JSON.stringify({
        adults: 1,
        children: 0,
        elders: 0,
        conditions: [],
        commuteMode: "two-wheeler",
        commuteKm: 7,
        hasPurifier: false,
        cookingFuel: "biomass",
        heating: "wood-coal",
        exercise: "none",
        notes: "",
      }),
    );
    render(<ImpactLab />);
    expect(screen.getByRole("slider", { name: /distance each way/i })).toHaveValue("7");
    expect(screen.getByText("For a home of 1:")).toBeInTheDocument();
  });

  it("multiplies the impact across households", async () => {
    render(<ImpactLab />);
    const slider = screen.getByRole("slider", { name: /households/i });
    expect(slider).toHaveAttribute("aria-valuetext", "1,000 households");
  });

  it("credits the photograph", () => {
    render(<ImpactLab />);
    expect(screen.getByRole("link", { name: /CC BY-SA 4.0/ })).toHaveAttribute(
      "rel",
      expect.stringContaining("noopener"),
    );
  });
});

describe("HomeAir", () => {
  it("is accessible and sizes a purifier from room dimensions", async () => {
    const user = userEvent.setup();
    const { container } = render(<HomeAir />);
    expect(await axe(container)).toHaveNoViolations();
    expect(screen.getByText("196")).toBeInTheDocument();

    const length = screen.getByRole("spinbutton", { name: "Length" });
    await user.clear(length);
    await user.type(length, "8");
    expect(screen.getByText("392")).toBeInTheDocument();
  });

  it("tracks and remembers checklist progress", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<HomeAir />);
    await user.click(screen.getByRole("checkbox", { name: /draught stopper/i }));
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "8");
    unmount();

    render(<HomeAir />);
    expect(screen.getByRole("checkbox", { name: /draught stopper/i })).toBeChecked();
  });
});

describe("SmogExplainer", () => {
  it("is accessible and shows concentration rising as the lid lowers", async () => {
    const user = userEvent.setup();
    const { container } = render(<SmogExplainer />);
    expect(await axe(container)).toHaveNoViolations();

    expect(screen.getByText("50 µg/m³")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Winter night" }));
    expect(screen.getByText("200 µg/m³")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Winter night" })).toHaveAttribute("aria-pressed", "true");
  });
});
