import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetStoredStateMemory, useStoredState } from "@/hooks/useStoredState";

const readNumber = (v: unknown) => (typeof v === "number" && v >= 0 ? v : null);

beforeEach(() => {
  resetStoredStateMemory();
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useStoredState", () => {
  it("starts from the initial value when nothing is saved", () => {
    const { result } = renderHook(() => useStoredState("k", readNumber, 1));
    expect(result.current[0]).toBe(1);
  });

  it("reads a valid saved value and ignores invalid or corrupt ones", () => {
    window.localStorage.setItem("good", "7");
    window.localStorage.setItem("bad", "-3");
    window.localStorage.setItem("corrupt", "{not json");
    expect(renderHook(() => useStoredState("good", readNumber, 1)).result.current[0]).toBe(7);
    expect(renderHook(() => useStoredState("bad", readNumber, 1)).result.current[0]).toBe(1);
    expect(renderHook(() => useStoredState("corrupt", readNumber, 1)).result.current[0]).toBe(1);
  });

  it("persists updates, including functional ones, and shares them across components", () => {
    const first = renderHook(() => useStoredState("shared", readNumber, 0));
    const second = renderHook(() => useStoredState("shared", readNumber, 0));
    act(() => first.result.current[1](5));
    act(() => first.result.current[1]((n) => n + 1));
    expect(first.result.current[0]).toBe(6);
    expect(second.result.current[0]).toBe(6);
    expect(window.localStorage.getItem("shared")).toBe("6");
  });

  it("keeps working for the session when the browser refuses to save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    const { result } = renderHook(() => useStoredState("private", readNumber, 0));
    act(() => result.current[1](3));
    expect(result.current[0]).toBe(3);
  });

  it("follows changes made in another tab", () => {
    const { result } = renderHook(() => useStoredState("tabs", readNumber, 0));
    act(() => result.current[1](2));
    act(() => {
      window.localStorage.setItem("tabs", "9");
      window.dispatchEvent(new StorageEvent("storage", { key: "tabs" }));
    });
    expect(result.current[0]).toBe(9);
  });
});
