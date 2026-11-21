import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_FEDAPAY_API_BASE = "https://api.fedapay.com/v1";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function getFedapayApiBase(): string {
  const raw = process.env.FEDAPAY_API_BASE ?? DEFAULT_FEDAPAY_API_BASE;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("FEDAPAY_API_BASE_INVALIDE");
  }

  const allowedHosts = new Set(["api.fedapay.com", "sandbox-api.fedapay.com"]);
  if (
    url.protocol !== "https:" ||
    !allowedHosts.has(url.hostname) ||
    !["/v1", "/v1/"].includes(url.pathname) ||
    url.search ||
    url.hash
  ) {
    throw new Error("FEDAPAY_API_BASE_INVALIDE");
  }

  return `${url.origin}/v1`;
}

function isValidPaymentUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "fedapay.com" || url.hostname.endsWith(".fedapay.com"))
    );
  } catch {
    return false;
  }
}

export function isFedaPayConfigured(): boolean {
  if (!process.env.FEDAPAY_SECRET_KEY?.trim() || !process.env.FEDAPAY_WEBHOOK_SECRET?.trim()) {
    return false;
  }
  try {
    getFedapayApiBase();
    return true;
  } catch {
    return false;
  }
}

export function isFedaPayLiveConfigured(): boolean {
  return isFedaPayConfigured() && getFedapayApiBase() === DEFAULT_FEDAPAY_API_BASE;
}

export type FedapayTransaction = {
  transactionId: string;
  paymentUrl: string;
  amountXof: number;
  status: string;
};

/**
 * Crée une transaction FedaPay et renvoie l'URL de paiement.
 * Appelé uniquement côté serveur ; la clé secrète ne quitte jamais l'env.
 */
export async function createFedapayTransaction(params: {
  orderId: string;
  description: string;
  amountXof: number;
  customerEmail: string;
  callbackUrl: string;
}): Promise<FedapayTransaction> {
  const secret = process.env.FEDAPAY_SECRET_KEY?.trim();
  if (!secret) throw new Error("FEDAPAY_SECRET_KEY_ABSENT");

  const apiBase = getFedapayApiBase();
  const res = await fetch(`${apiBase}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      description: params.description,
      amount: params.amountXof,
      currency: { iso: "XOF" },
      callback_url: params.callbackUrl,
      custom_metadata: { orderId: params.orderId },
      customer: { email: params.customerEmail },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`FEDAPAY_ERROR_${res.status}`);
  }
  const transactionBody = asRecord(await res.json());
  const transaction =
    asRecord(transactionBody?.["v1/transaction"]) ??
    asRecord(transactionBody?.data) ??
    transactionBody;
  const transactionId = transaction?.id;
  if (typeof transactionId !== "string" && typeof transactionId !== "number") {
    throw new Error("FEDAPAY_REPONSE_INATTENDUE");
  }

  const tokenResponse = await fetch(
    `${apiBase}/transactions/${encodeURIComponent(String(transactionId))}/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    },
  );
  if (!tokenResponse.ok) {
    throw new Error(`FEDAPAY_TOKEN_ERROR_${tokenResponse.status}`);
  }
  const tokenBody = asRecord(await tokenResponse.json());
  const tokenResult =
    asRecord(tokenBody?.["v1/token"]) ??
    asRecord(tokenBody?.data) ??
    tokenBody;
  const paymentUrl = tokenResult?.url;
  if (!isValidPaymentUrl(paymentUrl)) {
    throw new Error("FEDAPAY_URL_PAIEMENT_INVALIDE");
  }

  return {
    transactionId: String(transactionId),
    paymentUrl: paymentUrl,
    amountXof: params.amountXof,
    status: typeof transaction?.status === "string" ? transaction.status : "pending",
  };
}

/**
 * Vérifie la signature du webhook FedaPay.
 * Format attendu : t=<timestamp>,s=<hmac-hex> sur le corps brut,
 * clé FEDAPAY_WEBHOOK_SECRET (header `x-fedapay-signature`).
 */
export function verifyFedapaySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
  const timestamp = Number(parts.t);
  const received = parts.s;
  if (!Number.isSafeInteger(timestamp) || !received) return false;

  const age = Date.now() / 1000 - timestamp;
  if (!Number.isFinite(age) || age < -300 || age > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
