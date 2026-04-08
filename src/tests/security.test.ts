/**
 * Security-focused tests.
 * Verifies that zod schemas reject malicious/malformed input,
 * and that localStorage/sessionStorage tamper scenarios are handled gracefully.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { getSavedAnalyses, saveAnalysis } from "../lib/savedAnalyses";

// ── Reproduce the carSchema from ItemEntryForm (keep in sync) ────────────────

const carSchema = z.object({
  category: z.literal("car"),
  make: z.string().trim().min(1).regex(/^[a-zA-Z0-9 \-'.,()/]+$/),
  model: z.string().trim().min(1).regex(/^[a-zA-Z0-9 \-'.,()/]+$/),
  year: z.number().int().min(1886).max(new Date().getFullYear() + 1),
  fuelType: z.enum(["gasoline", "diesel", "electric", "hybrid"]),
  state: z.string().min(2),
  annualMileage: z.number().positive(),
  mpg: z.number().positive(),
  fuelPricePerUnit: z.number().positive(),
  purchasePrice: z.number().nonnegative(),
  downPayment: z.number().nonnegative(),
  loanAmount: z.number().nonnegative(),
  loanInterestRate: z.number().min(0).max(50),
  loanTermMonths: z.number().int().min(0).max(120),
  insuranceMonthly: z.number().nonnegative(),
  registrationAnnual: z.number().nonnegative(),
  parkingMonthly: z.number().nonnegative(),
});

const validBase = {
  category: "car" as const,
  make: "Toyota",
  model: "Camry",
  year: 2022,
  fuelType: "gasoline" as const,
  state: "TX",
  annualMileage: 12000,
  mpg: 28,
  fuelPricePerUnit: 3.45,
  purchasePrice: 25000,
  downPayment: 5000,
  loanAmount: 20000,
  loanInterestRate: 6.5,
  loanTermMonths: 60,
  insuranceMonthly: 150,
  registrationAnnual: 250,
  parkingMonthly: 0,
};

// ── XSS / injection attempts ──────────────────────────────────────────────────

describe("schema — XSS rejection in make/model fields", () => {
  it("rejects <script> tag in make", () => {
    const r = carSchema.safeParse({ ...validBase, make: "<script>alert(1)</script>" });
    expect(r.success).toBe(false);
  });

  it("rejects <img onerror> payload in model", () => {
    const r = carSchema.safeParse({ ...validBase, model: "<img src=x onerror=alert(1)>" });
    expect(r.success).toBe(false);
  });

  it("rejects SQL injection attempt in make", () => {
    const r = carSchema.safeParse({ ...validBase, make: "'; DROP TABLE cars;--" });
    expect(r.success).toBe(false);
  });

  it("accepts valid make with hyphens and spaces", () => {
    const r = carSchema.safeParse({ ...validBase, make: "Mercedes-Benz" });
    expect(r.success).toBe(true);
  });

  it("accepts valid model with digits and parens", () => {
    const r = carSchema.safeParse({ ...validBase, model: "3 Series (F30)" });
    expect(r.success).toBe(true);
  });
});

// ── Numeric field edge cases ──────────────────────────────────────────────────

describe("schema — numeric field rejection", () => {
  it("rejects NaN for year", () => {
    const r = carSchema.safeParse({ ...validBase, year: NaN });
    expect(r.success).toBe(false);
  });

  it("rejects Infinity for year", () => {
    const r = carSchema.safeParse({ ...validBase, year: Infinity });
    expect(r.success).toBe(false);
  });

  it("rejects negative year", () => {
    const r = carSchema.safeParse({ ...validBase, year: -1 });
    expect(r.success).toBe(false);
  });

  it("rejects year 1885 (before first automobile)", () => {
    const r = carSchema.safeParse({ ...validBase, year: 1885 });
    expect(r.success).toBe(false);
  });

  it("rejects negative purchasePrice", () => {
    const r = carSchema.safeParse({ ...validBase, purchasePrice: -1 });
    expect(r.success).toBe(false);
  });

  it("rejects zero or negative annualMileage", () => {
    const r = carSchema.safeParse({ ...validBase, annualMileage: 0 });
    expect(r.success).toBe(false);
  });
});

// ── localStorage tamper tests ─────────────────────────────────────────────────

const TEST_USER = "test-user-security";
const lsKey = `truecost_analyses_${TEST_USER}`;

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("getSavedAnalyses — tamper resistance", () => {
  it("returns [] when localStorage contains malformed JSON", async () => {
    localStorage.setItem(lsKey, "{{{{not valid json}}}}");
    const results = await getSavedAnalyses(TEST_USER);
    expect(results).toEqual([]);
  });

  it("returns [] when localStorage contains valid JSON but wrong shape", async () => {
    localStorage.setItem(lsKey, JSON.stringify([{ evil: "payload", category: "xss" }]));
    const results = await getSavedAnalyses(TEST_USER);
    // item.category is missing the required structure — zod rejects
    expect(results).toEqual([]);
  });

  it("clears corrupt localStorage entry rather than letting it persist", async () => {
    localStorage.setItem(lsKey, "corrupted");
    await getSavedAnalyses(TEST_USER);
    // After zod rejection, the key should be removed so it doesn't keep failing
    expect(localStorage.getItem(lsKey)).toBeNull();
  });

  it("returns saved analyses when data is valid", async () => {
    const item = { ...validBase };
    await saveAnalysis(TEST_USER, item);
    const results = await getSavedAnalyses(TEST_USER);
    expect(results.length).toBe(1);
    expect(results[0].item.category).toBe("car");
  });
});
