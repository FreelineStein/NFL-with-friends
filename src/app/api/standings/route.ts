import { fetchStandings } from "@/lib/espn/standings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const teams = await fetchStandings();
    return Response.json({ teams, fetchedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch standings";
    console.error("api/standings:", message);
    return Response.json({ error: message }, { status: 502 });
  }
}
