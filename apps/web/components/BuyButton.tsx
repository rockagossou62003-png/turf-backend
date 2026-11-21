"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Achat SIMULÉ côté démonstration : la commande est créée côté serveur puis
 * confirmée via le webhook signé (HMAC) — identique au chemin d'un vrai
 * prestataire. Aucun paiement réel n'est effectué ici.
 */
export default function BuyButton({
  productCode,
  raceId,
  label,
  priceXof,
}: {
  productCode: string;
  raceId?: string | null;
  label: string;
  priceXof: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function buy() {
    setState("busy");
    setMessage(null);

    const orderRes = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCode, raceId }),
    });
    if (!orderRes.ok) {
      const data = await orderRes.json().catch(() => null);
      setState("error");
      setMessage(
        orderRes.status === 401
          ? "Connectez-vous avant d'acheter."
          : data?.error ?? "Création de commande impossible.",
      );
      return;
    }
    const { order } = await orderRes.json();

    const hookRes = await fetch("/api/payments/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });
    if (!hookRes.ok) {
      setState("error");
      setMessage("Confirmation du paiement refusée par le serveur.");
      return;
    }

    setState("done");
    setMessage(`Achat confirmé : ${label} (${priceXof} FCFA) — paiement simulé.`);
    router.refresh();
  }

  return (
    <span>
      <button className="btn btn-secondary" onClick={buy} disabled={state === "busy" || state === "done"}>
        {state === "busy" ? "Traitement…" : state === "done" ? "Acheté ✓" : `Acheter — ${priceXof} FCFA`}
      </button>
      {message && (
        <span className="muted" style={{ display: "block", marginTop: 8, fontSize: 13 }}>
          {message}
        </span>
      )}
    </span>
  );
}
