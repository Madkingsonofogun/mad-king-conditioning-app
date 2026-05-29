import { addProgressImageAction, updateClientProfileImageAction } from "@/app/actions";
import { requireClient } from "@/lib/auth";
import { getActivePackage } from "@/lib/data-access";
import { prisma } from "@/lib/prisma";

export default async function ClientProfilePage({ searchParams }: { searchParams: { error?: string } }) {
  const { profile: sessionProfile } = await requireClient();
  const profile = await prisma.clientProfile.findUniqueOrThrow({
    where: { id: sessionProfile.id },
    include: {
      assignedCoach: true,
      assessments: { orderBy: { assessmentDate: "desc" }, take: 1 },
      coachNotes: { where: { noteType: "Assessment Recommendation", visibleToClient: true }, orderBy: { noteDate: "desc" }, take: 1 },
      progressImages: { orderBy: { imageDate: "desc" } }
    }
  });
  const pkg = await getActivePackage(profile.id);
  const latestAssessment = profile.assessments[0];
  return (
    <main className="container stack">
      <div className="page-title">
        <div>
          <h1>Profile</h1>
          <p>Keep your profile photo and progress pictures updated for your coach.</p>
        </div>
      </div>
      {searchParams.error === "image" ? <p className="label easier">Please upload an image file.</p> : null}
      <section className="grid">
        <div className="card stack">
          {profile.profileImageUrl ? (
            <img className="profile-photo" src={profile.profileImageUrl} alt={`${profile.clientName} profile`} />
          ) : (
            <div className="profile-photo placeholder">{profile.clientName.slice(0, 1)}</div>
          )}
          <h2>{profile.clientName}</h2>
          <p>{profile.email}</p>
          <p>{profile.phone}</p>
          <form className="form" action={updateClientProfileImageAction}>
            <label className="field">
              <span>Profile Image</span>
              <input name="profileImage" type="file" accept="image/*" capture="environment" required />
            </label>
            <button className="button primary" type="submit">Update Profile Image</button>
          </form>
        </div>
        <div className="card stack"><h2>Training</h2><span className="label">{profile.sportFocus}</span><span className="label">{profile.goal}</span><span className="label">{profile.trainingDaysPerWeek} days/week</span><span className="label">{profile.sessionLength} minutes</span></div>
        <div className="card stack"><h2>Package</h2><p>{pkg?.packageType ?? "No active package"}</p><div className="metric">{pkg?.sessionsRemaining ?? 0}</div><p>sessions remaining</p></div>
        <div className="card stack">
          <h2>Assigned Coach</h2>
          {profile.assignedCoach ? (
            <>
              {profile.assignedCoach.profileImageUrl ? (
                <img className="profile-photo" src={profile.assignedCoach.profileImageUrl} alt={`${profile.assignedCoach.name} profile`} />
              ) : (
                <div className="profile-photo placeholder">{profile.assignedCoach.name.slice(0, 1)}</div>
              )}
              <strong>{profile.assignedCoach.name}</strong>
            </>
          ) : <p>No coach assigned yet.</p>}
        </div>
      </section>
      {latestAssessment ? (
        <section className="card stack">
          <h2>Assessment Result</h2>
          <div className="split">
            <span className="label active">{latestAssessment.planLevel}</span>
            <span className="label">{latestAssessment.clientLevel}</span>
            <span className="label">{latestAssessment.riskLevel} Risk</span>
            <span className="label">{latestAssessment.averageScore.toFixed(1)} Score</span>
          </div>
          <p>{profile.coachNotes[0]?.note ?? `Your coach recommends starting with ${latestAssessment.planLevel} workouts.`}</p>
        </section>
      ) : null}
      <section className="card stack">
        <h2>Progress Gallery</h2>
        <form className="form" action={addProgressImageAction}>
          <label className="field">
            <span>Progress Image</span>
            <input name="progressImage" type="file" accept="image/*" capture="environment" required />
          </label>
          <label className="field">
            <span>Date</span>
            <input name="imageDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="field">
            <span>Caption</span>
            <input name="caption" placeholder="Front view, side view, 4-week progress..." />
          </label>
          <button className="button primary" type="submit">Add Progress Image</button>
        </form>
        <div className="gallery-grid">
          {profile.progressImages.length ? profile.progressImages.map((image) => (
            <figure className="progress-card" key={image.id}>
              <img src={image.imageUrl} alt={image.caption || "Progress image"} />
              <figcaption>
                <strong>{image.imageDate.toLocaleDateString()}</strong>
                {image.caption ? <span>{image.caption}</span> : null}
              </figcaption>
            </figure>
          )) : <p>No progress images yet.</p>}
        </div>
      </section>
    </main>
  );
}
