export function getVisibleRaceProviders(): string[] {
  const configuredProvider = process.env.HORSE_RACING_PROVIDER ?? "demo";
  return configuredProvider === "manual" ? ["manual"] : [configuredProvider, "manual"];
}
