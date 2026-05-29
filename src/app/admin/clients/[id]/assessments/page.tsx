import { prisma } from "@/lib/prisma";
import { acceptClientProposedAssessmentAction, adoptAssessmentSuggestionAction, cancelScheduledAssessmentAction, createAssessmentAction, offerAnotherAssessmentAction, scheduleAssessmentAction } from "@/app/actions";
import { googleCalendarUrl } from "@/lib/calendar";
import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { PlanLevelBadge } from "@/components/Badges";
import { AssessmentForm } from "@/components/forms";

export default async function AssessmentsPage({ params }: { params: { id: string } }) {
  const session = await requireCoach();
  const client = await prisma.clientProfile.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      assignedCoach: true,
      packages: { where: { status: "Active" }, orderBy: { purchaseDate: "desc" }, take: 1 },
      assessments: { orderBy: { assessmentDate: "desc" } },
      scheduledAssessments: { include: { coach: true }, orderBy: { scheduledDate: "asc" } }
    }
  });
  const coaches = session.role === "ADMIN"
    ? await prisma.user.findMany({ where: { role: { in: ["COACH", "ADMIN"] } }, orderBy: { name: "asc" } })
    : [];
  const now = new Date();
  const latestAssessment = client.assessments[0];
  const readyAppointments = client.scheduledAssessments.filter((a) => a.status === "Scheduled" && a.scheduledDate <= now);
  return (
    <main className="container stack">
      <h1>{client.clientName} Assessments</h1>
      {readyAppointments.length ? (
        <section className="card stack">
          <h2>Ready To Score</h2>
          {readyAppointments.map((appointment) => (
            <div className="split" key={appointment.id}>
              <span className="label active">Assessment Time</span>
              <strong>{appointment.scheduledDate.toLocaleString()}</strong>
              <span className="muted">Complete the scoring form below to create the client's starting workout recommendation.</span>
            </div>
          ))}
        </section>
      ) : null}
      <section className="grid">
        <div className="card stack">
          <h2>Current Package</h2>
          <p>{client.packages[0]?.packageType ?? "No active package"}</p>
          <span className="label">{client.packages[0]?.trainingDaysPerWeek ?? client.trainingDaysPerWeek} days/week</span>
          <span className="label">{client.sessionLength} min sessions</span>
        </div>
        <div className="card stack">
          <h2>Latest Result</h2>
          {latestAssessment ? (
            <>
              <div className="metric">{latestAssessment.averageScore.toFixed(1)}</div>
              <PlanLevelBadge level={latestAssessment.planLevel} />
              <span className="label">{latestAssessment.clientLevel}</span>
              {latestAssessment.nextReassessmentDate ? <p>Next 2-week reassessment due {latestAssessment.nextReassessmentDate.toLocaleDateString()}.</p> : null}
              <p>Client should start with {latestAssessment.clientLevel} / {latestAssessment.planLevel} workouts. Daily check-ins only change today; 2-week reassessments can update the monthly plan.</p>
              <form action={adoptAssessmentSuggestionAction.bind(null, client.id)}>
                <button className="button primary" type="submit">Adopt Suggestion And Fill Monthly Plan</button>
              </form>
            </>
          ) : <p>No scored assessment yet.</p>}
        </div>
      </section>
      <section className="card stack">
        <h2>Assessment Requests</h2>
        {client.scheduledAssessments.filter((a) => !["Completed", "Canceled"].includes(a.status)).map((appointment) => (
          <div className="card compact stack" key={appointment.id}>
            <div className="split">
              <span className={`label ${appointment.status === "Scheduled" ? "active" : appointment.status === "Declined" ? "easier" : "draft"}`}>{appointment.status}</span>
              <strong>{appointment.scheduledDate.toLocaleString()}</strong>
              <span className="muted">Proposed by {appointment.proposedBy}</span>
              <span className="muted">Coach: {appointment.coach?.name ?? client.assignedCoach?.name ?? "Not assigned"}</span>
            </div>
            {appointment.notes ? <p>{appointment.notes}</p> : null}
            {appointment.responseNotes ? <p className="muted">{appointment.responseNotes}</p> : null}
            <div className="split">
              {appointment.status === "Client Proposed" ? (
                <form action={acceptClientProposedAssessmentAction.bind(null, client.id, appointment.id)}>
                  <button className="button primary" type="submit">Accept Client Date</button>
                </form>
              ) : null}
              <form action={cancelScheduledAssessmentAction.bind(null, client.id, appointment.id)}>
                <button className="button" type="submit">Cancel</button>
              </form>
              {appointment.status === "Scheduled" ? (
                <>
                  <a className="button warn" href={googleCalendarUrl({
                    title: `Assessment - ${client.clientName}`,
                    details: appointment.notes ?? "Mad King Conditioning assessment",
                    start: appointment.scheduledDate,
                    minutes: client.sessionLength || 60
                  })} target="_blank" rel="noreferrer">Add To Google</a>
                  <Link className="button" href={`/calendar/assessment/${appointment.id}`}>Add To Device Calendar</Link>
                </>
              ) : null}
            </div>
            {appointment.status !== "Scheduled" ? (
              <form className="grid" action={offerAnotherAssessmentAction.bind(null, client.id, appointment.id)}>
                <label className="field"><span>Offer Another Date</span><input name="assessmentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
                <label className="field"><span>Time</span><input name="assessmentTime" type="time" defaultValue="09:00" /></label>
                {session.role === "ADMIN" ? (
                  <label className="field">
                    <span>Coach</span>
                    <select name="coachId" defaultValue={appointment.coachId ?? client.assignedCoachId ?? session.userId}>
                      {coaches.map((coach) => <option value={coach.id} key={coach.id}>{coach.name}</option>)}
                    </select>
                  </label>
                ) : null}
                <label className="field"><span>Notes</span><input name="assessmentNotes" placeholder="Use the date discussed in chat" /></label>
                <button className="button warn" type="submit">Offer This Date</button>
              </form>
            ) : null}
          </div>
        ))}
        <form className="grid" action={scheduleAssessmentAction.bind(null, client.id)}>
          <label className="field"><span>Date</span><input name="assessmentDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
          <label className="field"><span>Time</span><input name="assessmentTime" type="time" defaultValue="09:00" /></label>
          {session.role === "ADMIN" ? (
            <label className="field">
              <span>Coach</span>
              <select name="coachId" defaultValue={client.assignedCoachId ?? session.userId}>
                {coaches.map((coach) => <option value={coach.id} key={coach.id}>{coach.name}</option>)}
              </select>
            </label>
          ) : null}
          <label className="field"><span>Notes</span><input name="assessmentNotes" placeholder="Assessment notes" /></label>
          <button className="button primary" type="submit">Propose Assessment Time</button>
        </form>
      </section>
      <AssessmentForm action={createAssessmentAction.bind(null, client.id)} />
      <section className="card stack">
        <h2>Movement Guide</h2>
        <div className="grid">
          {[
            ["Squat", "Sit hips back/down like a chair. Watch knees, heels, chest, pain-free depth."],
            ["Hinge", "Push hips back with soft knees. Watch flat back, hip movement, and balance."],
            ["Lunge", "Use support if needed. Watch knee tracking, torso, hip/knee pain, and balance."],
            ["Push", "Wall, incline, or floor push-up. Watch shoulder/wrist pain and body line."],
            ["Pull", "Band or cable row. Watch shoulder blades, posture, neck tension, and shoulder pain."],
            ["Balance", "Single-leg or supported stance. Watch unsafe wobble, dizziness, and knee control."],
            ["Cardio", "Walk, march, step, or shadowbox 2-3 minutes. Stop for chest pain or dizziness."],
            ["Strength", "Sit-to-stand, plank, carry, light squat/press/row. Quality before intensity."]
          ].map(([title, text]) => (
            <div className="card compact" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h2>History</h2>
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Average</th><th>Risk</th><th>Level</th><th>Movement Focus</th><th>Restrictions</th><th>Notes</th></tr></thead><tbody>
          {client.assessments.map((a) => <tr key={a.id}><td>{a.assessmentDate.toLocaleDateString()}</td><td>{a.assessmentType}</td><td>{a.averageScore.toFixed(1)}</td><td>{a.riskLevel}</td><td><PlanLevelBadge level={a.planLevel} /></td><td>{a.movementFocus}</td><td>{a.restrictions}</td><td>{a.coachNotes}</td></tr>)}
        </tbody></table></div>
      </section>
    </main>
  );
}
