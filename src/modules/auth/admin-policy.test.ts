import { describe, expect, it } from "vitest";
import { isAdmin, parseAdminEmails } from "./admin-policy";

const admins = parseAdminEmails(" Shop@Example.com, second@example.com ,");
const user = { uid: "u1", email: "shop@example.com", emailVerified: true };

describe("parseAdminEmails", () => {
  it("trims, lowercases and ignores empty entries", () => {
    expect([...admins]).toEqual(["shop@example.com", "second@example.com"]);
  });

  it("treats a missing value as no admins at all", () => {
    expect(parseAdminEmails(undefined).size).toBe(0);
    expect(parseAdminEmails("").size).toBe(0);
  });
});

describe("isAdmin", () => {
  it("accepts a verified listed email regardless of case", () => {
    expect(isAdmin(user, admins)).toBe(true);
    expect(isAdmin({ ...user, email: "SHOP@example.com" }, admins)).toBe(true);
  });

  it("rejects unverified emails", () => {
    expect(isAdmin({ ...user, emailVerified: false }, admins)).toBe(false);
  });

  it("rejects users without email or not on the list", () => {
    expect(isAdmin({ ...user, email: null }, admins)).toBe(false);
    expect(isAdmin({ ...user, email: "customer@example.com" }, admins)).toBe(false);
  });

  it("rejects everyone when no admins are configured", () => {
    expect(isAdmin(user, parseAdminEmails(undefined))).toBe(false);
  });
});
