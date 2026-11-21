import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { AqiScale, scalePosition } from "@/components/AqiScale";
import { EmptyPlan } from "@/components/EmptyPlan";
import { HeroWindow } from "@/components/HeroWindow";
import { LogoMark } from "@/components/LogoMark";
import { logoSvg } from "@/lib/logo";
import { skyFor } from "@/lib/sky";

const brightness = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255);
};
const blueBias = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return (n & 255) - ((n >> 16) & 255);
};

describe("skyFor", () => {
  it("paints clean air blue and smog brownish", () => {
    expect(blueBias(skyFor(10).top)).toBeGreaterThan(80);
    expect(blueBias(skyFor(300).top)).toBeLessThan(0);
  });

  it("dims the sky, hides the skyline and spreads the sun's glow as AQI rises", () => {
    expect(brightness(skyFor(400).top)).toBeLessThan(brightness(skyFor(50).top));
    expect(skyFor(400).skyline).toBeLessThan(skyFor(50).skyline);
    expect(skyFor(400).glow).toBeGreaterThan(skyFor(50).glow);
  });

  it("matches its stops exactly and clamps out-of-range input", () => {
    expect(skyFor(0).top).toBe("#5ea2d6");
    expect(skyFor(-50)).toEqual(skyFor(0));
    expect(skyFor(900)).toEqual(skyFor(500));
    expect(skyFor(Number.NaN)).toEqual(skyFor(0));
  });

  it("always returns valid hex colours", () => {
    for (let aqi = 0; aqi <= 500; aqi += 17) {
      const s = skyFor(aqi);
      for (const c of [s.top, s.horizon, s.sun]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("AqiScale", () => {
  it("positions the marker on a 0–500 scale", () => {
    expect(scalePosition(0)).toBe(0);
    expect(scalePosition(250)).toBe(50);
    expect(scalePosition(800)).toBe(100);
  });

  it("describes the reading for screen readers", async () => {
    const { container } = render(<AqiScale aqi={211} />);
    expect(screen.getByRole("img", { name: "US AQI 211 on a scale of 0 to 500: Very unhealthy." })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("HeroWindow", () => {
  it("describes the painted sky in words", async () => {
    const { container } = render(<HeroWindow aqi={211} place="New Delhi" />);
    expect(screen.getByRole("img", { name: /sky over New Delhi at US AQI 211.*dim orange sun/ })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows more particles in dirtier air", () => {
    const { container: dirty } = render(<HeroWindow aqi={300} place="A" />);
    const { container: clean } = render(<HeroWindow aqi={20} place="B" />);
    const count = (c: HTMLElement) => c.querySelectorAll("g[class*=particles] circle").length;
    expect(count(dirty)).toBeGreaterThan(count(clean));
  });

  it("has a neutral description before data arrives", () => {
    render(<HeroWindow aqi={null} place="New Delhi" />);
    expect(screen.getByRole("img", { name: /waiting for live air data/ })).toBeInTheDocument();
  });
});

describe("EmptyPlan and LogoMark", () => {
  it("previews what the plan will contain", async () => {
    const { container } = render(<EmptyPlan />);
    expect(screen.getByRole("heading", { name: "Your plan for today appears here" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("keeps the mark decorative and the standalone SVG well-formed", () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    const svg = logoSvg(64);
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('width="64"');
  });
});
