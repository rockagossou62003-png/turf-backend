import { describe, it, expect, afterEach } from "vitest";
import { createHmac } from "crypto";
import { verifyFedapaySignature, isFedaPayConfigured } from "@/lib/fedapay";

const SECRET = "test-webhook-secret";
const SECRET_ENV = "FEDAPAY_WEBHOOK_SECRET";

function sign(raw: string, ts: number) {
  return `t=${ts},v1=${createHmac("sha256", SECRET).update(`${ts}.${raw}`).digest("hex")}`;
}

describe("verifyFedapaySignature", () => {
  const original = process.env[SECRET_ENV];
  afterEach(() => {
    if (original === undefined) delete process.env[SECRET_ENV];
    else process.env[SECRET_ENV] = original;
  });

  it("accepte une signature valide et récente", () => {
    process.env[SECRET_ENV] = SECRET;
    const raw = JSON.stringify({ event: "transaction.status", data: { id: 1 } });
    expect(verifyFedapaySignature(raw, sign(raw, Math.floor(Date.now() / 1000)))).toBe(true);
  });

  it("refuse un rejeu ancien (> 5 min)", () => {
    process.env[SECRET_ENV] = SECRET;
    const raw = "{}";
    const old = Math.floor(Date.now() / 1000) - 400;
    expect(verifyFedapaySignature(raw, sign(raw, old))).toBe(false);
  });

  it("refuse une signature altérée", () => {
    process.env[SECRET_ENV] = SECRET;
    const raw = "{}";
    const tampered = sign(raw, Math.floor(Date.now() / 1000)).replace(/.$/, (c) => (c === "0" ? "1" : "0"));
    expect(verifyFedapaySignature(raw, tampered)).toBe(false);
  });

  it("refuse sans secret configuré ou sans header", () => {
    delete process.env[SECRET_ENV];
    expect(verifyFedapaySignature("{}", "t=1,v1=abc")).toBe(false);
    process.env[SECRET_ENV] = SECRET;
    expect(verifyFedapaySignature("{}", null)).toBe(false);
  });

  it("isFedaPayConfigured suit l'environnement", () => {
    const key = process.env.FEDAPAY_SECRET_KEY;
    try {
      delete process.env.FEDAPAY_SECRET_KEY;
      expect(isFedaPayConfigured()).toBe(false);
      process.env.FEDAPAY_SECRET_KEY = "sk_x";
      expect(isFedaPayConfigured()).toBe(true);
    } finally {
      if (key === undefined) delete process.env.FEDAPAY_SECRET_KEY;
      else process.env.FEDAPAY_SECRET_KEY = key;
    }
  });
});
