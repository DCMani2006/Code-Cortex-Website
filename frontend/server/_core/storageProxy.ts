import type { Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { ENV } from "./env";

// Local fallback dirs, checked before hitting Manus/Forge storage.
// Lets the app run outside the Manus sandbox (no BUILT_IN_FORGE_* env vars).
const LOCAL_ASSET_DIRS = [
  path.resolve(process.cwd(), "public", "assets"),
  path.resolve(process.cwd(), "client", "public", "manus-storage"),
];

function findLocalAsset(key: string): string | null {
  const safeKey = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
  for (const dir of LOCAL_ASSET_DIRS) {
    const candidate = path.resolve(dir, safeKey);
    if (!candidate.startsWith(dir)) continue; // path traversal guard
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // 1. Serve from disk if the asset was vendored into the repo.
    const localPath = findLocalAsset(key);
    if (localPath) {
      if (localPath.endsWith(".glb")) res.type("model/gltf-binary");
      res.sendFile(localPath);
      return;
    }

    // 2. Otherwise fall back to the Manus storage backend.
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      console.error(
        `[StorageProxy] "${key}" not found locally and BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY are not set. ` +
          `Drop the file into public/assets/ or set those env vars in .env`,
      );
      res.status(404).send(`Asset not found locally: ${key}`);
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
