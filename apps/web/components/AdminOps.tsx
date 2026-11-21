"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Panneau d'exploitation staff : synchronisation du fournisseur configuré
 * et génération d'analyses par le moteur. Toute publication reste manuelle
 * via la file de validation.
 */
export default function AdminOps({ providerCode }: { providerCode: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"sync" | "generate" | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, kind: "sync" | "generate") {
    setBusy(kind);
    setError(null);
    setResult(null);
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setBusy(null);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(`${data?.detail ?? data?.error ?? "Opération refusée."}`);
      return;
    }
    setResult(JSON.stringify(data, null, 2));
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-secondary" disabled={busy !== null} onClick={() => call("/api/admin/sync", "sync")}>
          {busy === "sync"
            ? "Synchronisation…"
            : providerCode === "demo"
              ? "Synchroniser (démo)"
              : providerCode === "theracingapi"
                  ? "Synchroniser (courses françaises)"
                  : `Synchroniser (${providerCode})`}
        </button>
        <button className="btn btn-secondary" disabled={busy !== null} onClick={() => call("/api/admin/generate", "generate")}>
          {busy === "generate" ? "Génération…" : "Générer les analyses"}
        </button>
      </div>
      {error && (
        <p style={{ color: "#ff8f8f", marginTop: 10, fontSize: 13 }}>
          {error}
        </p>
      )}
      {result && (
        <pre style={{ marginTop: 10, fontSize: 12, whiteSpace: "pre-wrap", color: "#9fb4cc" }}>{result}</pre>
      )}
           <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
        La synchronisation applique les contrôles qualité (non-partants, horaires) et met en quarantaine
        les courses modifiées de façon critique. Les analyses générées restent en attente de validation humaine.
      </p>
    </div>
  );
}
