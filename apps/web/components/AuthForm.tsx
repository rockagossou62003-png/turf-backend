"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "register" ? { email, password, displayName } : { email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Erreur inattendue.");
      return;
    }
    router.refresh();
    router.push("/mon-compte");
  }

  return (
    <form onSubmit={submit} className="panel" style={{ maxWidth: 460 }}>
      <h2>{mode === "login" ? "Connexion" : "Créer un compte"}</h2>
      {mode === "register" && (
        <p>
          <label className="muted">Nom affiché</label>
          <br />
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} />
        </p>
      )}
      <p>
        <label className="muted">Email</label>
        <br />
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
      </p>
      <p>
        <label className="muted">Mot de passe {mode === "register" && "(8 caractères minimum)"}</label>
        <br />
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
      </p>
      {error && <p style={{ color: "#ff8f8f" }}>{error}</p>}
      <button className="btn" disabled={busy} type="submit">
        {busy ? "…" : mode === "login" ? "Se connecter" : "Créer le compte"}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #33445d",
  background: "#0d1422",
  color: "#edf2f7",
  marginTop: 4,
};
