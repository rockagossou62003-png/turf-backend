import { describe, it, expect } from "vitest";
import { predictionKinds, projectPrediction, type EntitlementCheck } from "@/lib/authz";

describe("predictionKinds", () => {
  it("extrait les kinds des sélections", () => {
    expect(
      predictionKinds([
        { number: 1, horseName: "A", kind: "free_base" },
        { number: 3, horseName: "C", kind: "couple" },
      ]),
    ).toEqual(["free_base", "couple"]);
  });

  it("renvoie vide pour une entrée invalide", () => {
    expect(predictionKinds(null)).toEqual([]);
    expect(predictionKinds("x")).toEqual([]);
    expect(predictionKinds([{}, 3])).toEqual([]);
  });
});

describe("projectPrediction", () => {
  const base = {
    id: "p1",
    raceId: "r1",
    title: "Analyse",
    status: "PUBLISHED",
    publishedAt: new Date(),
    selections: [{ number: 3, horseName: "Perle Noire", kind: "couple" }],
    analysis: "Analyse payante confidentielle.",
  };

  it("ne fuite JAMAIS le contenu payant quand l'accès est refusé", () => {
    const denied: EntitlementCheck = { allowed: false, reason: "ENTITLEMENT_REQUIRED", requiredProduct: "COUPLE" };
    const out = projectPrediction(base, denied);
    expect(out.locked).toBe(true);
    expect(JSON.stringify(out)).not.toContain("Perle Noire");
    expect(JSON.stringify(out)).not.toContain("confidentielle");
    expect(out).toHaveProperty("requiredProduct", "COUPLE");
  });

  it("exige une authentification pour un anonyme", () => {
    const out = projectPrediction(base, { allowed: false, reason: "AUTH_REQUIRED" });
    expect(out.locked).toBe(true);
    expect(out.lockReason).toBe("AUTH_REQUIRED");
  });

  it("transmet le contenu complet quand l'accès est autorisé", () => {
    const out = projectPrediction(base, { allowed: true, source: "vip" });
    expect(out.locked).toBe(false);
    expect(out.selections).toEqual(base.selections);
    expect(out.analysis).toBe(base.analysis);
  });
});
