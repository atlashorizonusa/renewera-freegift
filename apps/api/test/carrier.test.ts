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

  it("strips the 420+ZIP+4 IMpb label prefix to the real USPS number", () => {
    // full label barcode = 420 + 62812 (ZIP) + 2838 (ZIP+4) + tracking
    const r = detectCarrier("4206281228389400130109355374900962");
    expect(r.carrier).toBe("USPS");
    expect(r.tracking_url).toContain("tLabels=9400130109355374900962");
    expect(r.tracking_url).not.toContain("420628");
  });

  it("strips the 420+ZIP5 IMpb label prefix (no ZIP+4)", () => {
    const r = detectCarrier("420628129400130109355374900962");
    expect(r.carrier).toBe("USPS");
    expect(r.tracking_url).toContain("tLabels=9400130109355374900962");
  });

  it("recognizes a plain USPS 9400… number unchanged", () => {
    const r = detectCarrier("9400130109355374900962");
    expect(r.carrier).toBe("USPS");
    expect(r.tracking_url).toContain("9400130109355374900962");
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
