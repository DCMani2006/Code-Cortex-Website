// Flat-file poll storage for "pick the next track" — one vote per browser
// (an anonymous id in a plain, non-sensitive cookie), changeable at any time.
// No database in this app; this mirrors the project's existing flat-file
// pattern (see server/teamPasswords.json in the root server/).
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parse } from "cookie";
import type { Request, Response } from "express";
import type { SpotifyTrack } from "./spotify";

const VOTER_COOKIE = "cc_voter_id";
const DATA_DIR = path.resolve(import.meta.dirname, "data");
const VOTES_FILE = path.join(DATA_DIR, "song-votes.json");

type VotesData = {
  voters: Record<string, string>; // anonId -> trackId
  tracks: Record<string, SpotifyTrack>; // trackId -> metadata, so the leaderboard survives without re-searching
};

function readVotes(): VotesData {
  try {
    const raw = fs.readFileSync(VOTES_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<VotesData>;
    return { voters: parsed.voters ?? {}, tracks: parsed.tracks ?? {} };
  } catch {
    return { voters: {}, tracks: {} };
  }
}

function writeVotes(data: VotesData) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(VOTES_FILE, JSON.stringify(data, null, 2));
}

export function getVoterId(req: Request, res: Response): string {
  const existing = parse(req.headers.cookie ?? "")[VOTER_COOKIE];
  if (existing) return existing;

  const id = randomUUID();
  res.cookie(VOTER_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30,
  });
  return id;
}

export function castVote(voterId: string, track: SpotifyTrack) {
  const data = readVotes();
  data.voters[voterId] = track.id;
  data.tracks[track.id] = track;
  writeVotes(data);
}

export function getLeaderboard(): Array<SpotifyTrack & { votes: number }> {
  const data = readVotes();
  const counts = new Map<string, number>();
  for (const trackId of Object.values(data.voters)) {
    counts.set(trackId, (counts.get(trackId) ?? 0) + 1);
  }

  return Object.values(data.tracks)
    .map((track) => ({ ...track, votes: counts.get(track.id) ?? 0 }))
    .filter((track) => track.votes > 0)
    .sort((a, b) => b.votes - a.votes);
}

export function getMyVote(voterId: string): string | null {
  const data = readVotes();
  return data.voters[voterId] ?? null;
}
