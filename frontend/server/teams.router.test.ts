import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  createParticipantSession: vi.fn(),
  createTeam: vi.fn(),
  deleteParticipantSession: vi.fn(),
  getParticipantSession: vi.fn(),
  getTeamByTeamId: vi.fn(),
  getTeamByTeamName: vi.fn(),
}));

import { appRouter } from "./routers";
import { getTeamByTeamId, getTeamByTeamName } from "./db";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("teams.register", () => {
  beforeEach(() => {
    vi.mocked(getTeamByTeamId).mockResolvedValue(undefined);
    vi.mocked(getTeamByTeamName).mockResolvedValue(undefined);
  });

  it("rejects a team name that already exists after normalization", async () => {
    vi.mocked(getTeamByTeamName).mockResolvedValue({
      id: 1,
      teamId: "existing-team",
      teamName: "existing team",
      passwordHash: "salt:key",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(createContext());
    await expect(caller.teams.register({
      teamId: "new-team",
      teamName: "  Existing   Team ",
      password: "strong-password",
    })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
