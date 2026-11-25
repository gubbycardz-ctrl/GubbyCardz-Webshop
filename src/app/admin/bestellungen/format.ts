const dateTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

export function formatDateTime(iso: string) {
  return dateTime.format(new Date(iso));
}
