import { describe, expect, it } from "vitest";
import { hashPassword, normalizeTeamId, normalizeTeamName, verifyPassword } from "./teamAuth";

describe("team authentication helpers", () => {
  it("normalizes team identifiers and names consistently", () => {
    expect(normalizeTeamId("  Team Alpha  ")).toBe("team-alpha");
    expect(normalizeTeamName("  Team   Alpha  ")).toBe("team alpha");
  });

  it("hashes passwords and rejects incorrect passwords", () => {
    const hash = hashPassword("correct horse battery staple");
    expect(hash).toContain(":");
    expect(verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(verifyPassword("wrong password", hash)).toBe(false);
  });
});
