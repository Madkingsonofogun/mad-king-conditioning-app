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
        {workoutItems.length ? workoutItems.map((item) => (
          <div className="card compact stack" key={item.id}>
            <div className="split">
              <span className="label active">Scheduled</span>
              <strong>{item.client.clientName}</strong>
              <span>{item.sessionDate?.toLocaleString()}</span>
              <span className="muted">{item.sportFocus} - {item.sessionPart}</span>
            </div>
            <p>{item.exerciseName}</p>
            <div className="split">
              <a className="button warn" href={googleCalendarUrl({
                title: `${item.sportFocus} Coaching - ${item.client.clientName}`,
                details: `${item.sessionPart}: ${item.exerciseName}`,
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
