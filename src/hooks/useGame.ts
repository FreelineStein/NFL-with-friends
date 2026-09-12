"use client";

import { useCallback, useEffect, useState } from "react";
import type { Markets, ModelFlags, ParticipantScore, TeamRecord } from "@/lib/types";
import { participants } from "@/config/picks";
import { results } from "@/config/results";
import { scoreParticipants } from "@/lib/scoring";

export interface GameState {
  teams: TeamRecord[];
  markets: Markets;
  model: ModelFlags | null;
  scores: ParticipantScore[];
  lastUpdated: Date | null;
  loading: boolean;
  /** Standings failed; nothing useful to render. */
  error: string | null;
  /** Odds failed; standings and settled scores still render. */
  oddsError: string | null;
  refresh: () => void;
}

interface StandingsPayload {
  teams?: TeamRecord[];
  error?: string;
}

interface OddsPayload {
  markets?: Markets;
  model?: ModelFlags;
  error?: string;
}

interface Loaded {
  teams: TeamRecord[];
  markets: Markets;
  model: ModelFlags | null;
  oddsError: string | null;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `${url} returned ${res.status}`);
  return body;
}

/** Fetches both routes. Throws only when standings fail; an odds failure is reported softly. */
async function loadGame(): Promise<Loaded> {
  const [standingsResult, oddsResult] = await Promise.allSettled([
    getJson<StandingsPayload>("/api/standings"),
    getJson<OddsPayload>("/api/odds"),
  ]);
  if (standingsResult.status === "rejected") {
    throw standingsResult.reason instanceof Error ? standingsResult.reason : new Error("Failed to load standings");
  }
  const loaded: Loaded = {
    teams: standingsResult.value.teams ?? [],
    markets: {},
    model: null,
    oddsError: null,
  };
  if (oddsResult.status === "fulfilled") {
    loaded.markets = oddsResult.value.markets ?? {};
    loaded.model = oddsResult.value.model ?? null;
  } else {
    loaded.oddsError = oddsResult.reason instanceof Error ? oddsResult.reason.message : "Failed to load odds";
  }
  return loaded;
}

export function useGame(): GameState {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [markets, setMarkets] = useState<Markets>({});
  const [model, setModel] = useState<ModelFlags | null>(null);
  const [scores, setScores] = useState<ParticipantScore[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [oddsError, setOddsError] = useState<string | null>(null);

  const apply = useCallback((loaded: Loaded) => {
    setTeams(loaded.teams);
    setMarkets(loaded.markets);
    setModel(loaded.model);
    setOddsError(loaded.oddsError);
    setScores(scoreParticipants(participants, loaded.teams, loaded.markets, results));
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  const fail = useCallback((err: unknown) => {
    setError(err instanceof Error ? err.message : "Failed to load standings");
    setLoading(false);
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setOddsError(null);
    loadGame().then(apply, fail);
  }, [apply, fail]);

  useEffect(() => {
    loadGame().then(apply, fail);
  }, [apply, fail]);

  return { teams, markets, model, scores, lastUpdated, loading, error, oddsError, refresh };
}
