"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type RunnerInput = {
  number: string;
  horseName: string;
  jockeyName: string;
  trainerName: string;
  isNonRunner: boolean;
};

const emptyRunner = (): RunnerInput => ({
  number: "",
  horseName: "",
  jockeyName: "",
  trainerName: "",
  isNonRunner: false,
});

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "9px 10px",
  border: "1px solid #34445a",
  borderRadius: 6,
  background: "#0d1624",
  color: "#e5edf7",
};

export default function AdminManualRaceForm() {
  const router = useRouter();
  const [meetingName, setMeetingName] = useState("");
  const [venue, setVenue] = useState("");
  const [raceNumber, setRaceNumber] = useState("");
  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [distance, setDistance] = useState("");
  const [surface, setSurface] = useState("");
  const [source, setSource] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [runners, setRunners] = useState<RunnerInput[]>([emptyRunner()]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateRunner(index: number, patch: Partial<RunnerInput>) {
    setRunners((current) => current.map((runner, runnerIndex) => (runnerIndex === index ? { ...runner, ...patch } : runner)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const startDate = new Date(startsAt);
      if (Number.isNaN(startDate.getTime())) {
        throw new Error("Indique une date et une heure de départ valides.");
      }

      const declaredRunners = runners
        .filter((runner) => runner.horseName.trim())
        .map((runner) => ({
          ...(runner.number.trim() ? { number: Number(runner.number) } : {}),
          horseName: runner.horseName.trim(),
          ...(runner.jockeyName.trim() ? { jockeyName: runner.jockeyName.trim() } : {}),
          ...(runner.trainerName.trim() ? { trainerName: runner.trainerName.trim() } : {}),
          isNonRunner: runner.isNonRunner,
        }));

      const response = await fetch("/api/admin/manual-races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raceDate: startsAt.slice(0, 10),
          meetingName,
          venue,
          raceNumber,
          name,
          startsAt: startDate.toISOString(),
          ...(distance.trim() ? { distanceMeters: Number(distance) } : {}),
          ...(surface.trim() ? { surface: surface.trim() } : {}),
          source,
          rightsConfirmed,
          runners: declaredRunners,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.detail ?? data?.error ?? "Enregistrement impossible.");
      }

      setMessage(
        `Course enregistrée. ${data.racesUpserted} course et ${data.runnersUpserted} partant(s) pris en compte.${
          data.predictionsWithdrawn
            ? ` ${data.predictionsWithdrawn} pronostic(s) publié(s) retiré(s) après la modification.`
            : ""
        }`,
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inattendue pendant l’enregistrement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
      <p className="muted" style={{ margin: 0 }}>
        Saisis une course à la fois. Pour la corriger plus tard, réutilise la même date, le même hippodrome et le même
        numéro (ex. R1C1). Utilise uniquement des données que tu as le droit de publier.
      </p>
      <p className="muted" style={{ margin: 0 }}>
        Toute modification de la course ou des partants retire ses pronostics déjà publiés afin qu’ils soient revérifiés.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
        <label>
          Réunion
          <input value={meetingName} onChange={(event) => setMeetingName(event.target.value)} required maxLength={100} style={inputStyle} />
        </label>
        <label>
          Hippodrome
          <input value={venue} onChange={(event) => setVenue(event.target.value)} required maxLength={100} style={inputStyle} />
        </label>
        <label>
          N° de course
          <input value={raceNumber} onChange={(event) => setRaceNumber(event.target.value)} required maxLength={20} placeholder="R1C1" style={inputStyle} />
        </label>
        <label>
          Nom de la course
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={160} style={inputStyle} />
        </label>
        <label>
          Date et heure de départ
          <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required style={inputStyle} />
        </label>
        <label>
          Distance (mètres, facultatif)
          <input type="number" min={1} max={10000} step={1} value={distance} onChange={(event) => setDistance(event.target.value)} style={inputStyle} />
        </label>
        <label>
          Surface (facultatif)
          <input value={surface} onChange={(event) => setSurface(event.target.value)} maxLength={60} placeholder="Trot, gazon…" style={inputStyle} />
        </label>
        <label>
          Source autorisée
          <input value={source} onChange={(event) => setSource(event.target.value)} required maxLength={200} placeholder="Ex. flux sous licence" style={inputStyle} />
        </label>
      </div>

      <fieldset style={{ border: "1px solid #34445a", borderRadius: 8, padding: 12 }}>
        <legend>Partants</legend>
        <div style={{ display: "grid", gap: 10 }}>
          {runners.map((runner, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, alignItems: "end" }}>
              <label>
                N°
                <input type="number" min={1} max={99} step={1} value={runner.number} onChange={(event) => updateRunner(index, { number: event.target.value })} style={inputStyle} />
              </label>
              <label>
                Cheval
                <input value={runner.horseName} onChange={(event) => updateRunner(index, { horseName: event.target.value })} maxLength={120} style={inputStyle} />
              </label>
              <label>
                Jockey
                <input value={runner.jockeyName} onChange={(event) => updateRunner(index, { jockeyName: event.target.value })} maxLength={120} style={inputStyle} />
              </label>
              <label>
                Entraîneur
                <input value={runner.trainerName} onChange={(event) => updateRunner(index, { trainerName: event.target.value })} maxLength={120} style={inputStyle} />
              </label>
              <label style={{ display: "flex", gap: 6, alignItems: "center", paddingBottom: 8 }}>
                <input type="checkbox" checked={runner.isNonRunner} onChange={(event) => updateRunner(index, { isNonRunner: event.target.checked })} />
                NP
              </label>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={runners.length === 1}
                onClick={() => setRunners((current) => current.filter((_, runnerIndex) => runnerIndex !== index))}
                aria-label={`Supprimer le partant ${index + 1}`}
              >
                −
              </button>
            </div>
          ))}
        </div>
        <button className="btn btn-secondary" type="button" onClick={() => setRunners((current) => [...current, emptyRunner()])} style={{ marginTop: 10 }}>
          Ajouter un partant
        </button>
      </fieldset>

      <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} required />
        Je confirme que TURF PRO a le droit de publier les données de cette source.
      </label>

      {error && <p role="alert" style={{ color: "#ff8f8f", margin: 0 }}>{error}</p>}
      {message && <p role="status" style={{ color: "#9fe3b0", margin: 0 }}>{message}</p>}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? "Enregistrement…" : "Enregistrer la course"}
      </button>
    </form>
  );
}
