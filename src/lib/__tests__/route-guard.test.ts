import { describe, it, expect } from "vitest";
import { routeDecision } from "../route-guard";

describe("routeDecision", () => {
  describe("/ (public landing page)", () => {
    it("lets unauthenticated visitors (and crawlers) through — no redirect", () => {
      expect(routeDecision("/", null, false)).toEqual({ type: "next" });
    });

    it("redirects an authenticated ADMIN to /admin", () => {
      expect(routeDecision("/", "ADMIN", true)).toEqual({ type: "redirect", to: "/admin" });
    });

    it("redirects an authenticated EMPLOYER to /employer/dashboard", () => {
      expect(routeDecision("/", "EMPLOYER", true)).toEqual({
        type: "redirect",
        to: "/employer/dashboard",
      });
    });

    it("redirects an authenticated SEEKER to /jobs", () => {
      expect(routeDecision("/", "SEEKER", true)).toEqual({ type: "redirect", to: "/jobs" });
    });

    it("redirects an authenticated user without a role to /role-select", () => {
      expect(routeDecision("/", null, true)).toEqual({ type: "redirect", to: "/role-select" });
    });
  });

  describe("auth-gated routes", () => {
    it("redirects unauthenticated requests to / (the landing page), not /sign-in", () => {
      expect(routeDecision("/employer/dashboard", null, false)).toEqual({
        type: "redirect",
        to: "/",
      });
      expect(routeDecision("/admin", null, false)).toEqual({ type: "redirect", to: "/" });
      expect(routeDecision("/messages/abc", null, false)).toEqual({ type: "redirect", to: "/" });
    });

    it("lets authenticated requests through", () => {
      expect(routeDecision("/employer/dashboard", "EMPLOYER", true)).toEqual({ type: "next" });
      expect(routeDecision("/admin", "ADMIN", true)).toEqual({ type: "next" });
    });
  });
});
