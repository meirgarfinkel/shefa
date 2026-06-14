import { describe, it, expect } from "vitest";
import robots from "../robots";

describe("robots", () => {
  it("no longer disallows /sign-in (the homepage now lives at /)", () => {
    const { rules } = robots();
    const disallow = Array.isArray(rules) ? [] : ((rules.disallow as string[]) ?? []);
    expect(disallow).not.toContain("/sign-in");
  });

  it("still disallows the auth-gated trees and the API", () => {
    const { rules } = robots();
    const disallow = Array.isArray(rules) ? [] : ((rules.disallow as string[]) ?? []);
    expect(disallow).toEqual(
      expect.arrayContaining([
        "/admin",
        "/employer",
        "/messages",
        "/seeker",
        "/role-select",
        "/api/",
      ]),
    );
  });
});
