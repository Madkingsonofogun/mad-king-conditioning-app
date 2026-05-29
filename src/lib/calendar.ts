type CalendarEventInput = {
  title: string;
  details?: string | null;
  location?: string | null;
  start: Date;
  minutes?: number;
};

function calendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function googleCalendarUrl(event: CalendarEventInput) {
  const end = new Date(event.start.getTime() + (event.minutes ?? 60) * 60 * 1000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${calendarDate(event.start)}/${calendarDate(end)}`,
    details: event.details ?? "",
    location: event.location ?? ""
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsCalendar(event: CalendarEventInput) {
  const end = new Date(event.start.getTime() + (event.minutes ?? 60) * 60 * 1000);
  const now = calendarDate(new Date());
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mad King Conditioning//Smart Coach//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@mad-king-conditioning`,
    `DTSTAMP:${now}`,
    `DTSTART:${calendarDate(event.start)}`,
    `DTEND:${calendarDate(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.details ?? "")}`,
    `LOCATION:${escapeIcs(event.location ?? "")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
}
