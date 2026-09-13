import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { spotifyRouter } from "./spotifyRouter";

export const appRouter = router({
  system: systemRouter,
  spotify: spotifyRouter,
});

export type AppRouter = typeof appRouter;
