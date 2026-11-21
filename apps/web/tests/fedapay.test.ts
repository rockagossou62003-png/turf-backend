import { describe, it, expect, afterEach, vi } from "vitest";
import { createHmac } from "crypto";
import {
  createFedapayTransaction,
  verifyFedapaySignature,
  isFedaPayConfigured,
  isFedaPayLiveConfigured,
} from "@/lib/fedapay";

const SECRET = "test-webhook-secret";
const SECRET_ENV = "FEDAPAY_WEBHOOK_SECRET";
const API_SECRET_ENV = "FEDAPAY_SECRET_KEY";
const API_BASE_ENV = "FEDAPAY_API_BASE";
const originalEnv = {
  [SECRET_ENV]: process.env[SECRET_ENV],
  [API_SECRET_ENV]: process.env[API_SECRET_ENV],
  [API_BASE_ENV]: process.env[API_BASE_ENV],
};

function sign(raw: string, ts: number) {
  return `t=${ts},s=${createHmac("sha256", SECRET).update(`${ts}.${raw}`).digest("hex")}`;
}

describe("verifyFedapaySignature", () => {
  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.unstubAllGlobals();
  });

  it("accepte une signature valide et récente", () => {
    process.env[SECRET_ENV] = SECRET;
    const raw = JSON.stringify({ event: "transaction.status", data: { id: 1 } });
    expect(verifyFedapaySignature(raw, sign(raw, Math.floor(Date.now() / 1000)))).toBe(true);
  });

  it("refuse les signatures avec un schéma différent de celui de FedaPay", () => {
    process.env[SECRET_ENV] = SECRET;
    const raw = "{}";
    const timestamp = Math.floor(Date.now() / 1000);
    expect(verifyFedapaySignature(raw, sign(raw, timestamp).replace(",s=", ",v1="))).toBe(false);
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
    delete process.env[API_SECRET_ENV];
    delete process.env[SECRET_ENV];
    expect(isFedaPayConfigured()).toBe(false);

    process.env[API_SECRET_ENV] = "sk_test_x";
    process.env[API_BASE_ENV] = "https://sandbox-api.fedapay.com/v1";
    expect(isFedaPayConfigured()).toBe(false);

    process.env[SECRET_ENV] = "wh_test_x";
    expect(isFedaPayConfigured()).toBe(true);
    expect(isFedaPayLiveConfigured()).toBe(false);

    process.env[API_BASE_ENV] = "http://example.com/v1";
    expect(isFedaPayConfigured()).toBe(false);
    expect(isFedaPayLiveConfigured()).toBe(false);
  });

  it("n’active le paiement réel que sur l’API Live avec les deux secrets", () => {
    process.env[API_SECRET_ENV] = "sk_live_x";
    process.env[SECRET_ENV] = "wh_live_x";
    process.env[API_BASE_ENV] = "https://api.fedapay.com/v1";
    expect(isFedaPayLiveConfigured()).toBe(true);
  });

  it("crée la transaction puis demande le lien de paiement FedaPay", async () => {
    process.env[API_SECRET_ENV] = "sk_test_x";
    process.env[API_BASE_ENV] = "https://sandbox-api.fedapay.com/v1";
    const responses = [
      new Response(JSON.stringify({ id: 123, status: "pending" }), { status: 201 }),
      new Response(JSON.stringify({ url: "https://sandbox.fedapay.com/payment/abc" }), { status: 200 }),
    ];
    const fetchMock = vi.fn(async () => responses.shift()!);
    vi.stubGlobal("fetch", fetchMock);

    const result = await createFedapayTransaction({
      orderId: "order-1",
      description: "Pass VIP",
      amountXof: 1000,
      customerEmail: "client@example.com",
      callbackUrl: "https://turf.example/mon-compte",
    });

    expect(result).toMatchObject({
      transactionId: "123",
      paymentUrl: "https://sandbox.fedapay.com/payment/abc",
      amountXof: 1000,
      status: "pending",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://sandbox-api.fedapay.com/v1/transactions",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://sandbox-api.fedapay.com/v1/transactions/123/token",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("refuse un lien de paiement non sécurisé ou hors domaine FedaPay", async () => {
    process.env[API_SECRET_ENV] = "sk_test_x";
    process.env[API_BASE_ENV] = "https://sandbox-api.fedapay.com/v1";
    const responses = [
      new Response(JSON.stringify({ id: 123 }), { status: 201 }),
      new Response(JSON.stringify({ url: "https://evil.example/pay" }), { status: 200 }),
    ];
    vi.stubGlobal("fetch", vi.fn(async () => responses.shift()!));

    await expect(
      createFedapayTransaction({
        orderId: "order-1",
        description: "Pass VIP",
        amountXof: 1000,
        customerEmail: "client@example.com",
        callbackUrl: "https://turf.example/mon-compte",
      }),
    ).rejects.toThrow("FEDAPAY_URL_PAIEMENT_INVALIDE");
  });
});
