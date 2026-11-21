"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type QueueItem = { id: string; title: string; status: string; race: { name: string } };

const ACTIONS: { key: string; label: string }[] = [
  { key: "APPROVE", label: "Approuver" },
  { key: "REJECT", label: "Rejeter" },
  { key: "REVISE", label: "Demander révision" },
];

export default function AdminQueue({ queue }: { queue: QueueItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(predictionId: string, action: string) {
    setBusyId(predictionId);
    setError(null);
    const res = await fetch("/api/admin/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId, action }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Action refusée.");
      return;
    }
    router.refresh();
  }

  if (queue.length === 0) return <p className="muted">File vide.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Pronostic</th>
          <th>Course</th>
          <th>État</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {queue.map((q) => (
          <tr key={q.id}>
            <td>{q.title}</td>
            <td>{q.race.name}</td>
            <td>
              <span className="pill">{q.status}</span>
            </td>
            <td>
              {q.status === "APPROVED" ? (
                <button className="btn" disabled={busyId === q.id} onClick={() => act(q.id, "PUBLISH")}>
                  Publier
                </button>
              ) : (
                ACTIONS.map((a) => (
                  <button
                    key={a.key}
                    className="btn btn-secondary"
                    style={{ marginRight: 6 }}
                    disabled={busyId === q.id}
                    onClick={() => act(q.id, a.key)}
                  >
                    {a.label}
                  </button>
                ))
              )}
            </td>
          </tr>
        ))}
      </tbody>
      {error && (
        <tfoot>
          <tr>
            <td colSpan={4} style={{ color: "#ff8f8f" }}>
              {error}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
