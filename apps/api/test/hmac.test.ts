import { describe, it, expect } from "vitest";
import { timingSafeEqual } from "../src/lib/hmac";

describe("timingSafeEqual", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeEqual("secret", "secret")).toBe(true);
  });

  it("returns false for unequal-length strings", () => {
    expect(timingSafeEqual("a", "ab")).toBe(false);
  });

  it("returns false for differing same-length strings", () => {
    expect(timingSafeEqual("abc", "abd")).toBe(false);
  });
});
