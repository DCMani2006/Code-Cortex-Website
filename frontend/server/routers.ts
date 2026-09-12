import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createParticipantSession, createTeam, deleteParticipantSession, getParticipantSession, getTeamByTeamId, getTeamByTeamName } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { clearParticipantCookie, createSessionToken, getParticipantToken, getSessionExpiry, hashPassword, hashSessionToken, normalizeTeamId, normalizeTeamName, setParticipantCookie, verifyPassword } from "./teamAuth";

const teamInput = z.object({
  teamId: z.string().trim().min(3, "Team ID must be at least 3 characters").max(64, "Team ID is too long"),
  teamName: z.string().trim().min(2, "Team name must be at least 2 characters").max(120, "Team name is too long"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
});

const loginInput = z.object({
  teamId: z.string().trim().min(1),
  password: z.string().min(1),
});

function publicTeam(team: { teamId: string; teamName: string }) {
  return { teamId: team.teamId, teamName: team.teamName };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  teams: router({
    register: publicProcedure.input(teamInput).mutation(async ({ input, ctx }) => {
      const teamId = normalizeTeamId(input.teamId);
      const teamName = normalizeTeamName(input.teamName);
      if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(teamId)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Team ID can use lowercase letters, numbers, and hyphens." });
      }
      if (await getTeamByTeamId(teamId) || await getTeamByTeamName(teamName)) {
        throw new TRPCError({ code: "CONFLICT", message: "That team ID or team name already exists. Choose another." });
      }
      try {
        const team = await createTeam({ teamId, teamName, passwordHash: hashPassword(input.password) });
        if (!team) throw new Error("Team was not returned after creation");
        const token = createSessionToken();
        await createParticipantSession(hashSessionToken(token), team.id, getSessionExpiry());
        setParticipantCookie(ctx.req, ctx.res, token);
        return publicTeam(team);
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY") {
          throw new TRPCError({ code: "CONFLICT", message: "That team ID or team name already exists. Choose another." });
        }
        throw error;
      }
    }),
    login: publicProcedure.input(loginInput).mutation(async ({ input, ctx }) => {
      const team = await getTeamByTeamId(normalizeTeamId(input.teamId));
      if (!team || !verifyPassword(input.password, team.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid team ID or password." });
      }
      const token = createSessionToken();
      await createParticipantSession(hashSessionToken(token), team.id, getSessionExpiry());
      setParticipantCookie(ctx.req, ctx.res, token);
      return publicTeam(team);
    }),
    me: publicProcedure.query(async ({ ctx }) => {
      const token = getParticipantToken(ctx.req);
      if (!token) return null;
      const session = await getParticipantSession(hashSessionToken(token));
      return session ? publicTeam(session.team) : null;
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = getParticipantToken(ctx.req);
      if (token) await deleteParticipantSession(hashSessionToken(token));
      clearParticipantCookie(ctx.req, ctx.res);
      return { success: true } as const;
    }),
  }),
  admin: router({
    me: adminProcedure.query(({ ctx }) => ({ id: ctx.user.id, name: ctx.user.name, email: ctx.user.email, role: ctx.user.role })),
  }),
});

export type AppRouter = typeof appRouter;
