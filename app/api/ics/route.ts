import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

function escapeIcsText(s: string) {
  return (s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toIcsDateTime(iso: string) {
  // ISO -> YYYYMMDDTHHMMSSZ (UTC)
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 필요한 컬럼만
  const { data: apps, error } = await supabase
    .from("applications")
    .select("id, company, role, url, stage, deadline_at, followup_at, next_action, source, created_at")
    .order("created_at", { ascending: false });

  if (error) return new NextResponse(error.message, { status: 500 });

  const now = new Date().toISOString();
  const dtstamp = toIcsDateTime(now);

  const events: string[] = [];
  const addEvent = (opts: {
    uid: string;
    startIso: string;
    title: string;
    description: string;
    url?: string | null;
  }) => {
    const dtstart = toIcsDateTime(opts.startIso);

    // 기본 30분짜리 일정으로 생성(캘린더에서 보기 좋게)
    const endIso = new Date(new Date(opts.startIso).getTime() + 30 * 60 * 1000).toISOString();
    const dtend = toIcsDateTime(endIso);

    events.push(
      [
        "BEGIN:VEVENT",
        `UID:${escapeIcsText(opts.uid)}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${dtstart}`,
        `DTEND:${dtend}`,
        `SUMMARY:${escapeIcsText(opts.title)}`,
        `DESCRIPTION:${escapeIcsText(opts.description)}`,
        opts.url ? `URL:${escapeIcsText(opts.url)}` : null,
        "END:VEVENT",
      ].filter(Boolean).join("\r\n")
    );
  };

  for (const a of apps ?? []) {
    const base = `${a.company} / ${a.role}`.trim();

    // 1) 마감일 이벤트
    if (a.deadline_at) {
      addEvent({
        uid: `${a.id}-deadline`,
        startIso: a.deadline_at,
        title: `⏰ 마감: ${base}`,
        description: [
          `Stage: ${a.stage}`,
          a.next_action ? `Next: ${a.next_action}` : null,
          a.source ? `Source: ${a.source}` : null,
          a.url ? `Link: ${a.url}` : null,
        ].filter(Boolean).join("\n"),
        url: a.url,
      });
    }

    // 2) 팔로업 이벤트
    if (a.followup_at) {
      addEvent({
        uid: `${a.id}-followup`,
        startIso: a.followup_at,
        title: `📩 팔로업: ${base}`,
        description: [
          `Stage: ${a.stage}`,
          a.next_action ? `Next: ${a.next_action}` : null,
          a.source ? `Source: ${a.source}` : null,
          a.url ? `Link: ${a.url}` : null,
        ].filter(Boolean).join("\n"),
        url: a.url,
      });
    }
  }

  const ics =
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Job Tracker//KO//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Job Tracker",
      ...events,
      "END:VCALENDAR",
      "",
    ].join("\r\n");

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="job-tracker.ics"',
      "Cache-Control": "no-store",
    },
  });
}
