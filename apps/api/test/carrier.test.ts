import { describe, it, expect } from "vitest";
import { detectCarrier } from "../src/lib/carrier";

describe("detectCarrier", () => {
  it("recognizes UPS 1Z…", () => {
    const r = detectCarrier("1Z999AA10123456784");
    expect(r.carrier).toBe("UPS");
    expect(r.tracking_url).toContain("ups.com");
  });

  it("recognizes USPS 22-digit", () => {
    const r = detectCarrier("9400111899223456789012");
    expect(r.carrier).toBe("USPS");
    expect(r.tracking_url).toContain("usps.com");
  });

  it("recognizes FedEx 12-digit", () => {
    const r = detectCarrier("123456789012");
    expect(r.carrier).toBe("FedEx");
    expect(r.tracking_url).toContain("fedex.com");
  });

  it("falls back to Google search when unknown", () => {
    const r = detectCarrier("ABC-NOT-A-VALID-NUMBER");
    expect(r.carrier).toBe("Unknown");
    expect(r.tracking_url).toContain("google.com");
  });
});
