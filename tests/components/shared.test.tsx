import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { RangeField } from "@/components/RangeField";
import { formatNumber } from "@/lib/format";

describe("formatNumber", () => {
  it("uses Indian digit grouping and caps decimals", () => {
    expect(formatNumber(100_000)).toBe("1,00,000");
    expect(formatNumber(1234.567, 1)).toBe("1,234.6");
    expect(formatNumber(2.5)).toBe("3");
    expect(formatNumber(0)).toBe("0");
  });
});

describe("RangeField", () => {
  it("labels the slider, shows the value and reports changes as numbers", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <RangeField label="Days a week" display="5" min={1} max={7} value={5} onChange={onChange} valueText="5 days" />,
    );
    const slider = screen.getByRole("slider", { name: /days a week/i });
    expect(slider).toHaveAttribute("aria-valuetext", "5 days");
    expect(screen.getByText("5", { selector: "output" })).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "3" } });
    expect(onChange).toHaveBeenCalledWith(3);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("supports a dark tone for dark panels", () => {
    const { container } = render(
      <RangeField label="Households" display="10" min={0} max={5} value={1} onChange={() => {}} tone="dark" />,
    );
    expect(container.firstElementChild).toHaveAttribute("data-tone", "dark");
  });
});
