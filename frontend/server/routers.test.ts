import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("system.health", () => {
  it("reports ok", async () => {
    const caller = appRouter.createCaller({} as TrpcContext);
    const result = await caller.system.health({ timestamp: Date.now() });
    expect(result).toEqual({ ok: true });
  });
});
