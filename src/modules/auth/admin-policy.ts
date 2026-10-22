export type SessionUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
};

/** Parses a comma-separated list like "a@x.de, B@y.de". Missing or empty means nobody is admin. */
export function parseAdminEmails(value: string | undefined): ReadonlySet<string> {
  const emails = (value ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return new Set(emails);
}

// Only verified addresses count, otherwise anyone could register with an admin's email.
export function isAdmin(user: SessionUser, adminEmails: ReadonlySet<string>): boolean {
  return user.emailVerified && user.email !== null && adminEmails.has(user.email.toLowerCase());
}
