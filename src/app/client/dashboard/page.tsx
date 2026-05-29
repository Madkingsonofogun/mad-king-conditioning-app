import Link from "next/link";
import { dailyCheckInAction } from "@/app/actions";
import { requireClient } from "@/lib/auth";
import { getActivePackage, getClientVisibleMonthlyPlan, getClientVisibleNotes } from "@/lib/data-access";
import { PlanLevelBadge } from "@/components/Badges";
import { WorkoutDetailCard } from "@/components/WorkoutDetailCard";
import { prisma } from "@/lib/prisma";

export default async function ClientDashboard() {
  const { session, profile } = await requireClient();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const [plan, pkg, notes, scheduledAssessment, notifications, dailyCheckIn] = await Promise.all([
    getClientVisibleMonthlyPlan(profile.id),
    getActivePackage(profile.id),
    getClientVisibleNotes(profile.id),
    prisma.scheduledAssessment.findFirst({ where: { clientId: profile.id, status: { in: ["Coach Proposed", "Client Proposed", "Scheduled"] } }, orderBy: { scheduledDate: "asc" } }),
    prisma.notification.findMany({ where: { userId: session.userId, read: false }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.dailyCheckIn.findFirst({ where: { clientId: profile.id, checkInDate: { gte: dayStart, lt: dayEnd } }, orderBy: { createdAt: "desc" } })
  ]);
  const client = await prisma.clientProfile.findUniqueOrThrow({
    where: { id: profile.id },
    include: {
      assignedCoach: true,
      assessments: { orderBy: { assessmentDate: "desc" }, take: 1 },
      coachNotes: { where: { noteType: "Assessment Recommendation", visibleToClient: true }, orderBy: { noteDate: "desc" }, take: 1 }
    }
  });
  const latestAssessment = client.assessments[0];
  const assessmentRecommendation = client.coachNotes[0];
  const todayKey = new Date().toISOString().slice(0, 10);
  const datedToday = plan?.items.filter((item) => item.sessionDate?.toISOString().slice(0, 10) === todayKey) ?? [];
  const fallbackDay = plan?.items.filter((item) => item.day === 1) ?? [];
  const todaysRaw = (datedToday.length ? datedToday : fallbackDay).slice(0, 8);
  const alternatives = dailyCheckIn && dailyCheckIn.adjustment !== "As Planned"
    ? await prisma.exercise.findMany({
        where: {
          lowImpact: true,
          planLevel: "Recovery",
          ...(dailyCheckIn.painArea ? { NOT: { bodyArea: { contains: dailyCheckIn.painArea } } } : {})
        },
        take: todaysRaw.length || 4
      })
    : [];
  const todays = todaysRaw.map((item, index) => ({
    ...item,
    dailyAdjustmentNote: dailyCheckIn?.adjustmentNote ?? null,
    dailyAlternativeName: alternatives[index]?.exerciseName ?? null
  }));

  return (
    <main className="container stack">
      <div className="page-title">
        <div>
          <h1>Welcome, {profile.clientName}</h1>
          <p>Your approved workouts and coach-visible notes live here.</p>
        </div>
        <Link className="button primary" href="/client/check-in">Submit Check-In</Link>
      </div>

      <section className="grid">
        <div className="card stack">
          <h2>My Coach</h2>
          {client.assignedCoach ? (
            <>
              {client.assignedCoach.profileImageUrl ? (
                <img className="profile-photo" src={client.assignedCoach.profileImageUrl} alt={`${client.assignedCoach.name} profile`} />
              ) : (
                <div className="profile-photo placeholder">{client.assignedCoach.name.slice(0, 1)}</div>
              )}
              <strong>{client.assignedCoach.name}</strong>
              <Link className="button" href="/client/chat">Message Coach</Link>
            </>
          ) : <p>No coach assigned yet.</p>}
        </div>
        <div className="card stack">
          <h2>First Assessment</h2>
          {scheduledAssessment ? (
            <>
              <span className={`label ${scheduledAssessment.status === "Scheduled" ? "active" : "draft"}`}>{scheduledAssessment.status}</span>
              <div className="metric">{scheduledAssessment.scheduledDate.toLocaleDateString()}</div>
              <p>{scheduledAssessment.scheduledDate.toLocaleTimeString()}</p>
              <Link className="button" href="/client/assessments">Review Schedule</Link>
            </>
          ) : <p>Your coach will schedule or confirm your first assessment.</p>}
        </div>
        <div className="card stack"><h2>Package</h2><div className="metric">{pkg?.sessionsRemaining ?? 0}</div><p>sessions remaining</p></div>
        <div className="card stack"><h2>Training Days</h2><div className="metric">{profile.trainingDaysPerWeek}</div><p>{profile.sessionLength} minute sessions</p></div>
        <div className="card stack"><h2>Current Plan</h2>{plan ? <><PlanLevelBadge level={plan.planLevel} /><p>{plan.month}/{plan.year}</p></> : <p>No approved active plan yet.</p>}</div>
      </section>

      {notifications.length ? (
        <section className="card stack">
          <h2>Notifications</h2>
          {notifications.map((notification) => (
            <Link className="card compact stack" href={notification.href ?? "/client/dashboard"} key={notification.id}>
              <strong>{notification.title}</strong>
              <span className="muted">{notification.message}</span>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="card stack">
        <h2>Daily Check-In Before Workout</h2>
        {dailyCheckIn ? (
          <>
            <div className="split">
              <span className={`label ${dailyCheckIn.adjustment === "Recovery" ? "recovery" : dailyCheckIn.adjustment === "As Planned" ? "active" : "draft"}`}>{dailyCheckIn.adjustment}</span>
              <span className="muted">{dailyCheckIn.checkInDate.toLocaleString()}</span>
            </div>
            <p>{dailyCheckIn.adjustmentNote}</p>
          </>
        ) : (
          <form className="form" action={dailyCheckInAction}>
            <p>Answer this before starting so today&apos;s workout can stay safe.</p>
            <div className="grid">
              <label className="split"><input style={{ width: 20 }} name="feelsGood" type="checkbox" /> I feel good today</label>
              <label className="split"><input style={{ width: 20 }} name="injuredOrSick" type="checkbox" /> Injured, sick, or not feeling well</label>
              <label className="field"><span>Energy 1-10</span><input name="energyScore" type="number" min="1" max="10" defaultValue="7" /></label>
              <label className="field"><span>Soreness 1-10</span><input name="sorenessScore" type="number" min="1" max="10" defaultValue="3" /></label>
              <label className="field"><span>Pain Area</span><input name="painArea" placeholder="Shoulder, knee, back..." /></label>
            </div>
            <button className="button primary" type="submit">Check My Workout</button>
          </form>
        )}
      </section>

      {latestAssessment ? (
        <section className="card stack">
          <h2>Starting Workout Recommendation</h2>
          <div className="split">
            <PlanLevelBadge level={latestAssessment.planLevel} />
            <span className="label">{latestAssessment.clientLevel}</span>
            <span className="label">{latestAssessment.riskLevel} Risk</span>
            <span className="label">{latestAssessment.averageScore.toFixed(1)} Score</span>
          </div>
          <p>{assessmentRecommendation?.note ?? `Start with ${latestAssessment.planLevel} workouts until your coach approves the next plan.`}</p>
          <Link className="button" href="/client/monthly-plan">View Monthly Plan</Link>
        </section>
      ) : null}

      <section className="two-col">
        <div className="card stack">
          <h2>Today&apos;s Workout</h2>
          {todays.length ? todays.map((item) => <WorkoutDetailCard item={item} key={item.id} />) : <p>No approved workout is available yet.</p>}
          <Link className="button" href="/client/workouts">View All Workouts</Link>
        </div>
        <div className="card stack">
          <h2>Coach Notes</h2>
          {notes.slice(0, 3).map((note) => <p key={note.id}>{note.note}</p>)}
          <Link className="button" href="/client/notes">View Notes</Link>
        </div>
      </section>
    </main>
  );
}
