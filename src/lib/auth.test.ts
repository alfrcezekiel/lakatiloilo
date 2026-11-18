import { describe, expect, it } from "vitest";
import { safeNextPath } from "./auth";

// Where the login page may send a traveler afterwards (?next=). A crafted
// link must never send them to another website (an "open redirect", a
// common phishing trick).

describe("safeNextPath", () => {
  it.each([
    ["/destinations/5d1155a1-6e40-417d-9c84-09a990cae00d", "/destinations/5d1155a1-6e40-417d-9c84-09a990cae00d"],
    ["/", "/"],
    ["/travelers/abc?tab=reviews#latest", "/travelers/abc?tab=reviews#latest"],
    ["/destinations/x?focus=reply-1", "/destinations/x?focus=reply-1"],
  ])("keeps a path on this site: %s", (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });

  it.each([
    ["nothing", null],
    ["an empty value", ""],
    ["a script", "javascript:alert(1)"],
    ["another website", "https://evil.example"],
    ["another website without https", "//evil.example"],
    ["a backslash (browsers read it as /)", "/\\evil.example"],
    ["a tab inside (browsers delete it → //evil.example)", "/\t/evil.example"],
    ["a newline inside (browsers delete it → //evil.example)", "/\n/evil.example"],
    ["a carriage return inside", "/\r/evil.example"],
    ["a tab and a backslash", "/\t\\evil.example"],
    ["a word, not a path", "destinations"],
  ])("sends %s to the home page", (_case, next) => {
    expect(safeNextPath(next)).toBe("/");
  });

  it("keeps an encoded slash as part of the path, so it stays on this site", () => {
    expect(safeNextPath("/%2F/evil.example")).toBe("/%2F/evil.example");
  });
});
