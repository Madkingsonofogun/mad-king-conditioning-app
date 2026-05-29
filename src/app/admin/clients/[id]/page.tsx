import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { addProgressImageByCoachAction, adoptAssessmentSuggestionAction, assignCoachAction, createClientLoginAction, deleteClientAction, updateClientProfileImageByCoachAction } from "@/app/actions";
import { AdjustmentBadge, PlanLevelBadge, StatusBadge } from "@/components/Badges";
import { coachNeedsCurrentMonthPrompt } from "@/lib/rules";
import { requireCoach } from "@/lib/auth";

export default async function ClientDetail({ params, searchParams }: { params: { id: string }, searchParams: { error?: string } }) {
  const session = await requireCoach();
  const isAdmin = session.role === "ADMIN";
  const client = await prisma.clientProfile.findUniqueOrThrow({
    where: { id: params.id },
    include: {
      user: true,
      packages: { orderBy: { purchaseDate: "desc" } },
      assessments: { orderBy: { assessmentDate: "desc" }, take: 3 },
      weeklyCheckIns: { orderBy: { weekStartDate: "desc" }, take: 3 },
      scheduledAssessments: { where: { status: { in: ["Coach Proposed", "Client Proposed", "Scheduled"] } }, orderBy: { scheduledDate: "asc" }, take: 1 },
      monthlyPlans: { orderBy: [{ year: "desc" }, { month: "desc" }] },
      coachNotes: { orderBy: { noteDate: "desc" }, take: 3 },
      progressImages: { orderBy: { imageDate: "desc" }, take: 6 }
    }
  });
  const coaches = isAdmin ? await prisma.user.findMany({ where: { role: { in: ["COACH", "ADMIN"] } }, orderBy: { name: "asc" } }) : [];
  const needsPlan = coachNeedsCurrentMonthPrompt(client.monthlyPlans);

  return (
    <main className="container stack">
      <div className="page-title">
        <div>
          <h1>{client.clientName}</h1>
          <p>{client.sportFocus} • {client.goal} • {client.trainingDaysPerWeek} days/week • {client.sessionLength} min</p>
        </div>
        <div className="split">
          {isAdmin ? <Link className="button" href={`/admin/clients/${client.id}/edit`}>Edit Profile</Link> : null}
          <Link className="button primary" href={`/admin/clients/${client.id}/monthly-plans/new`}>Generate New Month Plan</Link>
        </div>
      </div>
      {searchParams.error === "image" ? <p className="label easier">Please choose a photo from the gallery or take a new photo.</p> : null}
      {needsPlan ? <div className="card split"><strong>No active plan for this month.</strong><Link className="button warn" href={`/admin/clients/${client.id}/monthly-plans/new`}>Generate New Month Plan</Link></div> : null}
      <section className="grid">
        <div className="card stack">
          {client.profileImageUrl ? (
            <img className="profile-photo" src={client.profileImageUrl} alt={`${client.clientName} profile`} />
          ) : (
            <div className="profile-photo placeholder">{client.clientName.slice(0, 1)}</div>
          )}
          <h2>Client Profile</h2>
          <p>{client.email}</p>
          <p>{client.phone}</p>
          <form className="form" action={updateClientProfileImageByCoachAction.bind(null, client.id)}>
            <label className="field">
              <span>Change Profile Picture</span>
              <input name="profileImage" type="file" accept="image/*" capture="environment" required />
            </label>
            <button className="button primary" type="submit">Save Profile Picture</button>
          </form>
        </div>
        <div className="card stack">
          <h2>First Assessment</h2>
          {client.scheduledAssessments[0] ? (
            <>
              <div className="metric">{client.scheduledAssessments[0].scheduledDate.toLocaleDateString()}</div>
              <p>{client.scheduledAssessments[0].scheduledDate.toLocaleTimeString()}</p>
              <span className={`label ${client.scheduledAssessments[0].status === "Scheduled" ? "active" : "draft"}`}>{client.scheduledAssessments[0].status}</span>
              <Link className="button primary" href={`/admin/clients/${client.id}/assessments`}>Review Assessment Schedule</Link>
            </>
          ) : client.assessments[0] ? (
            <p>Completed. Starting level is {client.assessments[0].planLevel}.</p>
          ) : <p>No first assessment scheduled yet.</p>}
        </div>
        <div className="card stack">
          <h2>Package</h2>
          {client.packages[0] ? (
            <>
              <div className="metric">{client.packages[0].sessionsRemaining}</div>
              <p>sessions remaining from {client.packages[0].packageType}</p>
              <StatusBadge status={client.packages[0].status} />
            </>
          ) : <p>No package yet.</p>}
          {isAdmin ? <Link className="button" href={`/admin/clients/${client.id}/packages`}>Manage Packages</Link> : null}
        </div>
        <div className="card stack">
          <h2>Latest Assessment</h2>
          {client.assessments[0] ? (
            <>
              <div className="metric">{client.assessments[0].averageScore.toFixed(1)}</div>
              <PlanLevelBadge level={client.assessments[0].planLevel} />
              <p>Recommended starting workout level: {client.assessments[0].planLevel}</p>
              <form action={adoptAssessmentSuggestionAction.bind(null, client.id)}>
                <button className="button primary" type="submit">Adopt Suggestion</button>
              </form>
            </>
          ) : <p>No assessment yet.</p>}
          <Link className="button" href={`/admin/clients/${client.id}/assessments`}>Assessment History</Link>
        </div>
        <div className="card stack">
          <h2>Latest Check-In</h2>
          {client.weeklyCheckIns[0] ? (
            <>
              <strong>{client.weeklyCheckIns[0].checkInResult}</strong>
              <AdjustmentBadge adjustment={client.weeklyCheckIns[0].planAdjustment} />
            </>
          ) : <p>No check-in yet.</p>}
          <Link className="button" href={`/admin/clients/${client.id}/check-ins`}>Check-Ins</Link>
        </div>
      </section>
      <section className="card stack">
        <div className="page-title">
          <div>
            <h2>Progress Gallery</h2>
            <p>Images uploaded by the client for visual progress tracking.</p>
          </div>
        </div>
        <div className="gallery-grid">
          {client.progressImages.length ? client.progressImages.map((image) => (
            <figure className="progress-card" key={image.id}>
              <img src={image.imageUrl} alt={image.caption || "Progress image"} />
              <figcaption>
                <strong>{image.imageDate.toLocaleDateString()}</strong>
                {image.caption ? <span>{image.caption}</span> : null}
              </figcaption>
            </figure>
          )) : <p>No progress images uploaded yet.</p>}
        </div>
        <form className="form" action={addProgressImageByCoachAction.bind(null, client.id)}>
          <label className="field">
            <span>Add Progress Image</span>
            <input name="progressImage" type="file" accept="image/*" capture="environment" required />
          </label>
          <label className="field">
            <span>Date</span>
            <input name="imageDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="field">
            <span>Caption</span>
            <input name="caption" placeholder="Front view, side view, check-in photo..." />
          </label>
          <button className="button primary" type="submit">Add To Gallery</button>
        </form>
      </section>
      <section className="grid">
        {isAdmin ? (
          <div className="card stack">
            <h2>Client Login</h2>
            <p>{client.user ? `Connected to ${client.user.email}` : "No login account yet."}</p>
            <form className="form" action={createClientLoginAction.bind(null, client.id)}>
              <input name="email" type="email" defaultValue={client.email} />
              <input name="password" type="password" defaultValue="client123" />
              <button className="button primary" type="submit">Create/Reset Login</button>
            </form>
          </div>
        ) : null}
        {isAdmin ? (
          <div className="card stack">
            <h2>Assigned Coach</h2>
            <form className="form" action={assignCoachAction.bind(null, client.id)}>
              <select name="assignedCoachId" defaultValue={client.assignedCoachId ?? ""}>
                <option value="">No coach assigned</option>
                {coaches.map((coach) => <option value={coach.id} key={coach.id}>{coach.name}</option>)}
              </select>
              <button className="button primary" type="submit">Assign Coach</button>
            </form>
          </div>
        ) : null}
        <div className="card stack">
          <h2>Quick Links</h2>
          <Link className="button" href={`/admin/clients/${client.id}/monthly-plans`}>Monthly Plans</Link>
          <Link className="button" href={`/admin/clients/${client.id}/sessions`}>Workout Sessions</Link>
          <Link className="button" href={`/admin/clients/${client.id}/chat`}>Client Chat</Link>
          <Link className="button" href={`/admin/clients/${client.id}/notes`}>Coach Notes</Link>
          {isAdmin ? (
            <form action={deleteClientAction.bind(null, client.id)}>
              <button className="button" type="submit">Delete Client</button>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}
