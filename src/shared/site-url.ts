import { z } from "zod";

// Absolute base URL of the shop, needed wherever crawlers get full links (sitemap,
// robots.txt, canonical tags). Set per environment in `apphosting.yaml`; the fallback
// keeps `npm run dev` and local builds working. Fails fast on a malformed value.
const LOCAL_SITE_URL = "http://localhost:3000";

export const SITE_URL = z.url().parse(process.env.SITE_URL ?? LOCAL_SITE_URL).replace(/\/+$/, "");

/** Absolute URL for a path such as "/spiele". */
export function absoluteUrl(path: string) {
  return `${SITE_URL}${path}`;
}
