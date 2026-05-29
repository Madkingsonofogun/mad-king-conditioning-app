import Link from "next/link";
import { updateOwnCoachProfileImageAction } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { PlanLevelBadge } from "@/components/Badges";
import { coachNeedsCurrentMonthPrompt } from "@/lib/rules";
import { requireCoach } from "@/lib/auth";

export default async function AdminDashboard({ searchParams }: { searchParams: { error?: string } }) {
  const session = await requireCoach();
  const isAdmin = session.role === "ADMIN";
  const [currentUser, clients, packages, activePlans, recentCheckIns, scheduledAssessments, notifications] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: session.userId } }),
    prisma.clientProfile.findMany({ include: { monthlyPlans: true }, orderBy: { clientName: "asc" } }),
    prisma.package.findMany({ where: { status: "Active" } }),
    prisma.monthlyPlan.findMany({ where: { planStatus: "Active" } }),
    prisma.weeklyCheckIn.findMany({ take: 5, orderBy: { weekStartDate: "desc" }, include: { client: true } }),
    prisma.scheduledAssessment.findMany({ where: { status: { in: ["Coach Proposed", "Client Proposed", "Scheduled"] } }, include: { client: true }, orderBy: { scheduledDate: "asc" }, take: 8 }),
    prisma.notification.findMany({ where: { userId: session.userId, read: false }, include: { client: true }, orderBy: { createdAt: "desc" }, take: 8 })
  ]);
  const needsPlan = clients.filter((client) => coachNeedsCurrentMonthPrompt(client.monthlyPlans));

  return (
    <main className="container stack">
      <div className="page-title">
        <div>
          <h1>{isAdmin ? "Admin Control Center" : "Coach Workspace"}</h1>
          <p>{isAdmin ? "Full app control, clients, coaches, exercises, packages, and plans." : "Work with clients, assessments, check-ins, exercises, and today’s workout changes."}</p>
        </div>
        <Link className="button primary" href="/admin/clients/new">
          New Client
        </Link>
      </div>
      {searchParams.error === "image" ? <p className="label easier">Please choose an image from your device.</p> : null}
      <section className="card split">
        {currentUser.profileImageUrl ? (
          <img className="avatar large" src={currentUser.profileImageUrl} alt={`${currentUser.name} profile`} />
        ) : (
          <div className="avatar large placeholder">{currentUser.name.slice(0, 1)}</div>
        )}
        <div className="stack">
          <h2>{isAdmin ? "Admin Profile Image" : "Coach Profile Image"}</h2>
          <p>This image is shown to clients when they view their assigned coach.</p>
          <form className="form" action={updateOwnCoachProfileImageAction}>
            <label className="field">
              <span>Upload From Device</span>
              <input name="coachImage" type="file" accept="image/*" capture="environment" required />
            </label>
            <button className="button primary" type="submit">Update My Image</button>
          </form>
        </div>
      </section>
      <section className="grid">
        <div className="card">
          <h3>Active Clients</h3>
          <div className="metric">{clients.length}</div>
        </div>
        {isAdmin ? (
          <>
            <div className="card">
              <h3>Active Packages</h3>
              <div className="metric">{packages.length}</div>
            </div>
            <div className="card">
              <h3>Active Plans</h3>
              <div className="metric">{activePlans.length}</div>
            </div>
          </>
        ) : null}
        <div className="card">
          <h3>Need Month Plan</h3>
          <div className="metric">{needsPlan.length}</div>
        </div>
        <div className="card">
          <h3>Assessments Scheduled</h3>
          <div className="metric">{scheduledAssessments.length}</div>
        </div>
      </section>
      {!isAdmin ? (
        <section className="card stack">
          <h2>Coach Tools</h2>
          <p>Open a client to complete assessments, review check-ins, adjust today’s workout from their monthly plan, or use the exercise library for substitutions.</p>
          <div className="split">
            <Link className="button primary" href="/admin/clients">Open Clients</Link>
            <Link className="button" href="/admin/exercise-library">Exercise Library</Link>
          </div>
        </section>
      ) : null}
      {notifications.length ? (
        <section className="card stack">
          <h2>Notifications</h2>
          {notifications.map((notification) => (
            <Link className="card compact stack" href={notification.href ?? "/admin/dashboard"} key={notification.id}>
              <strong>{notification.title}</strong>
              <span className="muted">{notification.message}</span>
            </Link>
          ))}
        </section>
      ) : null}
      {scheduledAssessments.length ? (
        <section className="card stack">
          <h2>Assessment Schedule</h2>
          {scheduledAssessments.map((appointment) => (
            <div key={appointment.id} className="split">
              <strong>{appointment.client.clientName}</strong>
              <span className={`label ${appointment.status === "Scheduled" ? "active" : "draft"}`}>{appointment.status}</span>
              <span className="muted">{appointment.scheduledDate.toLocaleString()}</span>
              <Link className="button" href={`/admin/clients/${appointment.clientId}/assessments`}>
                Review
              </Link>
            </div>
          ))}
        </section>
      ) : null}
      {needsPlan.length ? (
        <section className="card stack">
          <h2>Current Month Prompts</h2>
          {needsPlan.map((client) => (
            <div key={client.id} className="split">
              <strong>{client.clientName}</strong>
              <span className="muted">{client.trainingDaysPerWeek} days, {client.sessionLength} min</span>
              <Link className="button warn" href={`/admin/clients/${client.id}/monthly-plans/new`}>
                Generate New Month Plan
              </Link>
            </div>
          ))}
        </section>
      ) : null}
      <section className="card">
        <h2>Recent Check-Ins</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Recovery</th>
                <th>Adjustment</th>
                <th>Plan</th>
              </tr>
            </thead>
            <tbody>
              {recentCheckIns.map((checkIn) => (
                <tr key={checkIn.id}>
                  <td>{checkIn.client.clientName}</td>
                  <td>{checkIn.checkInResult}</td>
                  <td>{checkIn.planAdjustment}</td>
                  <td><PlanLevelBadge level={checkIn.planAdjustment === "Make Easier" ? "Recovery" : "Baseline"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
