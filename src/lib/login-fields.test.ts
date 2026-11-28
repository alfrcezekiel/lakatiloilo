import { describe, expect, it } from "vitest";
import { LOGIN_FIELD_CODES, LOGIN_FIELD_MESSAGES, checkLogInFields } from "./login-fields";

// Shared by the traveler log-in and the team's sign-in (team request
// 2026-11-28), so both show the same sentence under each box.
describe("checkLogInFields", () => {
  it("gives each empty box its own message", () => {
    expect(checkLogInFields("", "")).toEqual({
      email: "Please enter your email address.",
      password: "Please enter your password.",
    });
  });

  it("tells an empty email apart from one without @", () => {
    expect(checkLogInFields("   ", "x").email).toBe("Please enter your email address.");
    expect(checkLogInFields("team", "x").email).toBe("Please enter a valid email address.");
  });

  it("accepts a filled-in email and password", () => {
    expect(checkLogInFields(" team@example.com ", "pretend")).toEqual({});
  });

  it("knows which box each backend code is about, with a sentence for each", () => {
    for (const [code, field] of Object.entries(LOGIN_FIELD_CODES)) {
      expect(["email", "password"]).toContain(field);
      expect(LOGIN_FIELD_MESSAGES[code as keyof typeof LOGIN_FIELD_MESSAGES]).toMatch(/^Please /);
    }
  });
});
