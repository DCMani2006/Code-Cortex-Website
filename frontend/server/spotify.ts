// Spotify Web API client using the Client Credentials flow (app-only access —
// no user login). Enough for catalog search; there's no venue playback control
// here by design (see the "pick the next track" feature: it's a voting board,
// not a queue). Requires SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET in .env.
import { ENV } from "./_core/env";

export type SpotifyTrack = {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
};

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppToken(): Promise<string> {
  if (!ENV.spotifyClientId || !ENV.spotifyClientSecret) {
    throw new Error(
      "Spotify is not configured: set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.",
    );
  }
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const basic = Buffer.from(
    `${ENV.spotifyClientId}:${ENV.spotifyClientSecret}`,
  ).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed (${response.status})`);
  }

  const body = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    value: body.access_token,
    // refresh a minute early so we never serve a token that expires mid-request
    expiresAt: Date.now() + (body.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  const token = await getAppToken();
  const url = new URL("https://api.spotify.com/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "8");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Spotify search failed (${response.status})`);
  }

  const body = (await response.json()) as {
    tracks: {
      items: Array<{
        id: string;
        name: string;
        artists: Array<{ name: string }>;
        album: { images: Array<{ url: string }> };
      }>;
    };
  };

  return body.tracks.items.map((track) => ({
    id: track.id,
    name: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    albumArt: track.album.images.at(-1)?.url ?? null,
  }));
}
