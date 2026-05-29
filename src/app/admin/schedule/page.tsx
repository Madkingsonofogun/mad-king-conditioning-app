import Link from "next/link";
import { googleCalendarUrl } from "@/lib/calendar";
import { requireCoach } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CoachSchedulePage() {
  const session = await requireCoach();
  const clientWhere = session.role === "ADMIN" ? {} : { OR: [{ assignedCoachId: session.userId }, { assignedCoachId: null }] };
  const assessmentWhere = session.role === "ADMIN" ? { status: "Scheduled" } : { status: "Scheduled", coachId: session.userId };
  const [assessments, workoutItems] = await Promise.all([
    prisma.scheduledAssessment.findMany({
      where: assessmentWhere,
      include: { coach: true, client: { include: { assignedCoach: true } } },
      orderBy: { scheduledDate: "asc" }
    }),
    prisma.monthlyPlanItem.findMany({
      where: {
        sessionDate: { not: null },
        client: clientWhere
      },
      include: { client: { include: { assignedCoach: true } } },
      orderBy: { sessionDate: "asc" },
      take: 100
    })
  ]);
  const workoutSessions = Array.from(
    workoutItems.reduce((sessions, item) => {
      const sessionKey = [
        item.clientId,
        item.monthlyPlanId,
        item.sessionDate?.toISOString() ?? "unscheduled",
        item.week,
        item.day
      ].join(":");
      const existing = sessions.get(sessionKey);
      if (existing) {
        existing.parts.push(`${item.sessionPart}: ${item.exerciseName}`);
        return sessions;
      }
      sessions.set(sessionKey, {
        id: item.id,
        client: item.client,
        sessionDate: item.sessionDate,
        sessionLength: item.sessionLength,
        sportFocus: item.sportFocus,
        goal: item.goal,
        week: item.week,
        day: item.day,
        parts: [`${item.sessionPart}: ${item.exerciseName}`]
      });
      return sessions;
    }, new Map<string, {
      id: string;
      client: (typeof workoutItems)[number]["client"];
      sessionDate: Date | null;
      sessionLength: number;
      sportFocus: string;
      goal: string;
      week: number;
      day: number;
      parts: string[];
    }>())
  ).map(([, groupedSession]) => groupedSession);

  return (
    <main className="container stack">
      <div className="page-title">
        <div>
          <h1>Coach Schedule</h1>
          <p>Locked assessments and dated coaching sessions appear here for calendar use.</p>
        </div>
      </div>

      <section className="card stack">
        <h2>Assessments</h2>
        {assessments.length ? assessments.map((assessment) => (
          <div className="card compact stack" key={assessment.id}>
            <div className="split">
              <span className="label active">Locked</span>
              <strong>{assessment.client.clientName}</strong>
              <span>{assessment.scheduledDate.toLocaleString()}</span>
              <span className="muted">Coach: {assessment.coach?.name ?? assessment.client.assignedCoach?.name ?? "Unassigned"}</span>
            </div>
            <div className="split">
              <Link className="button" href={`/admin/clients/${assessment.clientId}/assessments`}>Open</Link>
              <a className="button warn" href={googleCalendarUrl({
                title: `Assessment - ${assessment.client.clientName}`,
                details: assessment.notes ?? "Mad King Conditioning assessment",
                start: assessment.scheduledDate,
                minutes: assessment.client.sessionLength || 60
              })} target="_blank" rel="noreferrer">Add To Google</a>
              <a className="button" href={`/calendar/assessment/${assessment.id}`}>Add To Device Calendar</a>
            </div>
          </div>
        )) : <p>No locked assessments yet.</p>}
      </section>

      <section className="card stack">
        <h2>Coaching Sessions</h2>
        {workoutSessions.length ? workoutSessions.map((item) => (
          <div className="card compact stack" key={`${item.client.id}-${item.sessionDate?.toISOString()}-${item.week}-${item.day}`}>
            <div className="split">
              <span className="label active">Scheduled</span>
              <strong>{item.client.clientName}</strong>
              <span>{item.sessionDate?.toLocaleString()}</span>
              <span className="muted">{item.sportFocus} - Week {item.week}, Day {item.day}</span>
            </div>
            <p>{item.parts.slice(0, 4).join(" | ")}{item.parts.length > 4 ? ` + ${item.parts.length - 4} more` : ""}</p>
            <div className="split">
              <a className="button warn" href={googleCalendarUrl({
                title: `${item.sportFocus} Coaching - ${item.client.clientName}`,
                details: item.parts.join("\n"),
                start: item.sessionDate ?? new Date(),
                minutes: item.sessionLength || 60
              })} target="_blank" rel="noreferrer">Add To Google</a>
              <a className="button" href={`/calendar/workout/${item.id}`}>Add To Device Calendar</a>
            </div>
          </div>
        )) : <p>No dated coaching sessions yet. Add session dates inside monthly plan items to place them on the coach schedule.</p>}
      </section>
    </main>
  );
}
