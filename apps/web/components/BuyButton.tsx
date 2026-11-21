"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

export default function BuyButton({
  productCode,
  raceId,
  label,
  priceXof,
  paymentAvailable,
}: {
  productCode: string;
  raceId?: string | null;
  label: string;
  priceXof: number;
  paymentAvailable: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function buy() {
    setState("busy");
    setMessage(null);

    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productCode, raceId }),
      });
      const orderData = asRecord(await orderRes.json().catch(() => null));
      if (!orderRes.ok) {
        const error = orderData?.error;
        const message =
          error === "PAIEMENT_NON_CONFIGURE"
            ? "Le paiement en ligne n’est pas encore configuré."
            : error === "PAIEMENT_INDISPONIBLE"
              ? "Le prestataire de paiement est momentanément indisponible."
              : typeof error === "string"
                ? error
                : "Création de commande impossible.";
        throw new Error(
          orderRes.status === 401
            ? "Connectez-vous avant d'acheter."
            : message,
        );
      }

      const payment = asRecord(orderData?.payment);
      if (payment?.provider === "fedapay" && typeof payment.paymentUrl === "string") {
        window.location.assign(payment.paymentUrl);
        return;
      }

      const order = asRecord(orderData?.order);
      if (payment?.provider !== "simulation" || typeof order?.id !== "string") {
        throw new Error("Réponse de paiement invalide.");
      }
      if (process.env.NODE_ENV === "production") {
        throw new Error("Le paiement FedaPay n’est pas configuré.");
      }

      const hookRes = await fetch("/api/payments/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      });
      if (!hookRes.ok) {
        throw new Error("Confirmation du paiement refusée par le serveur.");
      }

      setState("done");
      setMessage(`Achat confirmé : ${label} (${priceXof} FCFA) — paiement de test.`);
      router.refresh();
    } catch (caught) {
      setState("error");
      setMessage(caught instanceof Error ? caught.message : "Erreur pendant le paiement.");
    }
  }

  return (
    <span>
      <button
        className="btn btn-secondary"
        onClick={buy}
        disabled={!paymentAvailable || state === "busy" || state === "done"}
      >
        {state === "busy"
          ? "Traitement…"
          : state === "done"
            ? "Acheté ✓"
            : paymentAvailable
              ? `Acheter — ${priceXof} FCFA`
              : "Paiement indisponible"}
      </button>
      {message && (
        <span className="muted" style={{ display: "block", marginTop: 8, fontSize: 13 }}>
          {message}
        </span>
      )}
    </span>
  );
}
