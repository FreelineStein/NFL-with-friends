import { buildTeamIdMap, fetchStandings } from "@/lib/espn/standings";
import { fetchFutures } from "@/lib/espn/futures";
import { deriveMarkets } from "@/lib/odds";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const teams = await fetchStandings();
    const teamIdToAbbr = buildTeamIdMap(teams);
    const teamLabels: Record<string, string> = {};
    for (const t of teams) teamLabels[t.abbreviation] = t.displayName;
    const listed = await fetchFutures(teamIdToAbbr, teamLabels);
    const { markets, model } = deriveMarkets(listed, teamLabels);
    return Response.json({ markets, model, fetchedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch odds";
    console.error("api/odds:", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
