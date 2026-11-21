import { describe, expect, it } from "vitest";
import { comboKey } from "@/lib/combobox";

describe("comboKey", () => {
  it("moves down and wraps from the last option to the first", () => {
    expect(comboKey("ArrowDown", -1, 3, true)).toEqual({ type: "move", index: 0 });
    expect(comboKey("ArrowDown", 2, 3, true)).toEqual({ type: "move", index: 0 });
  });

  it("moves up and wraps from the first option, or from nothing highlighted, to the last", () => {
    expect(comboKey("ArrowUp", 0, 3, true)).toEqual({ type: "move", index: 2 });
    expect(comboKey("ArrowUp", -1, 3, true)).toEqual({ type: "move", index: 2 });
    expect(comboKey("ArrowUp", 2, 3, true)).toEqual({ type: "move", index: 1 });
  });

  it("ignores arrows when there are no options", () => {
    expect(comboKey("ArrowDown", -1, 0, false)).toEqual({ type: "none" });
    expect(comboKey("ArrowUp", -1, 0, false)).toEqual({ type: "none" });
  });

  it("chooses the highlighted option on Enter only while the list is open", () => {
    expect(comboKey("Enter", 1, 3, true)).toEqual({ type: "choose", index: 1 });
    expect(comboKey("Enter", 1, 3, false)).toEqual({ type: "none" });
    expect(comboKey("Enter", -1, 3, true)).toEqual({ type: "none" });
    expect(comboKey("Enter", 5, 3, true)).toEqual({ type: "none" });
  });

  it("closes on Escape and ignores other keys", () => {
    expect(comboKey("Escape", 1, 3, true)).toEqual({ type: "close" });
    expect(comboKey("a", 1, 3, true)).toEqual({ type: "none" });
  });
});
