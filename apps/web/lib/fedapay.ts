import { createHmac, timingSafeEqual } from "crypto";

/**
 * Client FedaPay côté serveur (mode sandbox ou live).
 *
 * Règle produit : le paiement est confirmé UNIQUEMENT par webhook signé,
 * jamais par le retour navigateur. Si FEDAPAY_SECRET_KEY n'est pas
 * configuré, l'application reste en mode simulation locale (webhook démo).
 */

const FEDAPAY_API_BASE = process.env.FEDAPAY_API_BASE ?? "https://api.fedapay.com/v1";

export function isFedaPayConfigured(): boolean {
  return Boolean(process.env.FEDAPAY_SECRET_KEY);
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
  const secret = process.env.FEDAPAY_SECRET_KEY;
  if (!secret) throw new Error("FEDAPAY_SECRET_KEY_ABSENT");

  const res = await fetch(`${FEDAPAY_API_BASE}/transactions`, {
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
  const data = (await res.json()) as {
    "v1/transaction"?: { id: number | string; status?: string };
    token?: string;
  };
  const tx = data["v1/transaction"];
  if (!tx?.id || !data.token) throw new Error("FEDAPAY_REPONSE_INATTENDUE");

  const paymentUrl = `${FEDAPAY_API_BASE.replace("/v1", "")}/v1/payment-links/${data.token}`;
  return {
    transactionId: String(tx.id),
    paymentUrl,
    amountXof: params.amountXof,
    status: tx.status ?? "pending",
  };
}

/**
 * Vérifie la signature du webhook FedaPay.
 * Format attendu : t=<timestamp>,v1=<hmac-hex> sur le corps brut,
 * clé FEDAPAY_WEBHOOK_SECRET (header `x-fedapay-signature`).
 */
export function verifyFedapaySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
  const timestamp = parts["t"];
  const received = parts["v1"];
  if (!timestamp || !received) return false;

  // Rejeu : refuse les événements de plus de 5 minutes.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
