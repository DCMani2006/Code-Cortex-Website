import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { searchTracks } from "./spotify";
import { publicProcedure, router } from "./_core/trpc";
import { castVote, getLeaderboard, getMyVote, getVoterId } from "./votes";

export const spotifyRouter = router({
  search: publicProcedure
    .input(z.object({ query: z.string().trim().min(1).max(200) }))
    .query(async ({ input }) => {
      try {
        return await searchTracks(input.query);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Spotify search failed.",
        });
      }
    }),
  leaderboard: publicProcedure.query(({ ctx }) => {
    const voterId = getVoterId(ctx.req, ctx.res);
    return {
      tracks: getLeaderboard(),
      myVote: getMyVote(voterId),
    };
  }),
  vote: publicProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        artist: z.string().min(1),
        albumArt: z.string().nullable(),
      }),
    )
    .mutation(({ input, ctx }) => {
      const voterId = getVoterId(ctx.req, ctx.res);
      castVote(voterId, input);
      return { tracks: getLeaderboard() };
    }),
});
