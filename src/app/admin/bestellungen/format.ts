const dateTime = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

export function formatDateTime(iso: string) {
  return dateTime.format(new Date(iso));
}
