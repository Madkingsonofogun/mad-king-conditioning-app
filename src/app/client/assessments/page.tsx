import Link from "next/link";
import { acceptAssessmentAction, declineAssessmentAction, proposeAlternateAssessmentAction } from "@/app/actions";
import { requireClient } from "@/lib/auth";
import { googleCalendarUrl } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";

export default async function ClientAssessmentsPage() {
  const { profile } = await requireClient();
  const appointments = await prisma.scheduledAssessment.findMany({
    where: { clientId: profile.id, status: { notIn: ["Completed", "Canceled"] } },
    include: { coach: true },
    orderBy: { scheduledDate: "asc" }
  });

  return (
    <main className="container stack">
      <div className="page-title">
        <div>
          <h1>Assessment Schedule</h1>
          <p>Accept your coach's proposed time, decline it, or offer another date.</p>
        </div>
        <Link className="button" href="/client/chat">Chat With Coach</Link>
      </div>

      <section className="stack">
        {appointments.length ? appointments.map((appointment) => (
          <article className="card stack" key={appointment.id}>
            <div className="split">
              <span className={`label ${appointment.status === "Scheduled" ? "active" : appointment.status === "Declined" ? "easier" : "draft"}`}>{appointment.status}</span>
              <strong>{appointment.scheduledDate.toLocaleString()}</strong>
              <span className="muted">Coach: {appointment.coach?.name ?? "To be assigned"}</span>
            </div>
            {appointment.notes ? <p>{appointment.notes}</p> : null}
            {appointment.responseNotes ? <p className="muted">{appointment.responseNotes}</p> : null}

            {appointment.status === "Coach Proposed" ? (
              <div className="grid">
                <form action={acceptAssessmentAction.bind(null, appointment.id)}>
                  <button className="button primary" type="submit">Accept Time</button>
                </form>
                <form className="form" action={declineAssessmentAction.bind(null, appointment.id)}>
                  <input name="responseNotes" placeholder="Reason or note for coach" />
                  <button className="button" type="submit">Decline</button>
                </form>
                <form className="form" action={proposeAlternateAssessmentAction.bind(null, appointment.id)}>
                  <label className="field"><span>Alternate Date</span><input name="assessmentDate" type="date" required /></label>
                  <label className="field"><span>Alternate Time</span><input name="assessmentTime" type="time" required /></label>
                  <input name="responseNotes" placeholder="Note for coach" />
                  <button className="button warn" type="submit">Offer Alternate Date</button>
                </form>
              </div>
            ) : null}

            {appointment.status === "Client Proposed" ? (
              <p className="label draft">Waiting for coach to accept or offer another date.</p>
            ) : null}

            {appointment.status === "Scheduled" ? (
              <>
                <p className="label active">Locked in on your schedule and your coach's schedule.</p>
                <div className="split">
                  <a className="button warn" href={googleCalendarUrl({
                    title: `Assessment - ${profile.clientName}`,
                    details: appointment.notes ?? "Mad King Conditioning assessment",
                    start: appointment.scheduledDate,
                    minutes: profile.sessionLength || 60
                  })} target="_blank" rel="noreferrer">Add To Google</a>
                  <Link className="button" href={`/calendar/assessment/${appointment.id}`}>Add To Device Calendar</Link>
                </div>
              </>
            ) : null}
          </article>
        )) : (
          <section className="card">
            <h2>No assessment requests</h2>
            <p>Your coach will propose a time when an assessment needs to be scheduled.</p>
          </section>
        )}
      </section>
    </main>
  );
}
