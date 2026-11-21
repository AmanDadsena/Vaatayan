import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import { afterEach, expect, vi } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

expect.extend(axeMatchers);

const isBrowser = typeof window !== "undefined";

/**
 * Stand-in for next/image in jsdom: a plain <img>, minus props that only the
 * Image component understands, so React does not warn about unknown attributes.
 */
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const imgProps = { ...props };
    delete imgProps.preload;
    return createElement("img", imgProps);
  },
}));

if (isBrowser) {
  const { cleanup } = await import("@testing-library/react");
  const { resetStoredStateMemory } = await import("@/hooks/useStoredState");
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    resetStoredStateMemory();
  });

  // jsdom lacks these browser APIs used by the components.
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
}
