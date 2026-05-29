import { describe, it, expect } from "vitest";
import {
  ORDER_RE,
  EMAIL_RE,
  ZIP_RE,
  isDisposableEmail,
} from "../src/lib/validate";

describe("ORDER_RE", () => {
  it("accepts canonical Amazon order numbers", () => {
    expect(ORDER_RE.test("123-4567890-1234567")).toBe(true);
  });
  it("rejects malformed orders", () => {
    expect(ORDER_RE.test("123-456789-1234567")).toBe(false);
    expect(ORDER_RE.test("1234567890")).toBe(false);
    expect(ORDER_RE.test("")).toBe(false);
  });
});

describe("EMAIL_RE", () => {
  it("accepts simple addresses", () => {
    expect(EMAIL_RE.test("alice@example.com")).toBe(true);
  });
  it("rejects no-@ and no-domain", () => {
    expect(EMAIL_RE.test("alice@")).toBe(false);
    expect(EMAIL_RE.test("alice")).toBe(false);
    expect(EMAIL_RE.test("alice@domain")).toBe(false);
  });
});

describe("ZIP_RE", () => {
  it("accepts 5-digit and ZIP+4", () => {
    expect(ZIP_RE.test("12345")).toBe(true);
    expect(ZIP_RE.test("12345-6789")).toBe(true);
  });
  it("rejects too-short and letters", () => {
    expect(ZIP_RE.test("1234")).toBe(false);
    expect(ZIP_RE.test("abcde")).toBe(false);
  });
});

describe("isDisposableEmail", () => {
  it("flags known disposable domains", () => {
    expect(isDisposableEmail("foo@mailinator.com")).toBe(true);
    expect(isDisposableEmail("X@YOPMAIL.COM")).toBe(true);
  });
  it("passes real domains", () => {
    expect(isDisposableEmail("alice@example.com")).toBe(false);
    expect(isDisposableEmail("user@gmail.com")).toBe(false);
  });
});
